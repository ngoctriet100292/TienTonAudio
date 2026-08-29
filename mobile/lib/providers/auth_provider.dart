import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../data/models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  User? _user;
  bool _isLoading = false;
  String? _errorMessage;
  bool _requires2FA = false;
  String? _twoFactorTempToken;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;
  bool get requires2FA => _requires2FA;
  String? get twoFactorTempToken => _twoFactorTempToken;

  AuthProvider() {
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    if (token != null && token.isNotEmpty) {
      await fetchCurrentUser();
    }
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    _requires2FA = false;
    notifyListeners();

    try {
      final res = await _api.dio.post(
        ApiConstants.login,
        data: {'username': username, 'password': password},
      );

      if (res.statusCode == 200 && res.data['success'] == true) {
        final data = res.data['data'];
        
        // Kiểm tra xem có yêu cầu 2FA không
        if (data['requires_2fa'] == true) {
          _requires2FA = true;
          _twoFactorTempToken = data['temp_token'];
          _isLoading = false;
          notifyListeners();
          return true;
        }

        // Đăng nhập thành công
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', data['access_token']);
        await prefs.setString('refresh_token', data['refresh_token']);
        _user = User.fromJson(data['user']);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = res.data['message'] ?? 'Đăng nhập thất bại';
      }
    } catch (e) {
      _errorMessage = 'Lỗi kết nối: $e';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> verify2FA(String code) async {
    if (_twoFactorTempToken == null) return false;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.dio.post(
        ApiConstants.verify2FA,
        data: {
          'temp_token': _twoFactorTempToken,
          'code': code,
        },
      );

      if (res.statusCode == 200 && res.data['success'] == true) {
        final data = res.data['data'];
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', data['access_token']);
        await prefs.setString('refresh_token', data['refresh_token']);
        _user = User.fromJson(data['user']);
        _requires2FA = false;
        _twoFactorTempToken = null;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = res.data['message'] ?? 'Mã xác thực không hợp lệ';
      }
    } catch (e) {
      _errorMessage = 'Lỗi xác thực 2FA: $e';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> fetchCurrentUser() async {
    try {
      final res = await _api.dio.get(ApiConstants.me);
      if (res.statusCode == 200 && res.data['success'] == true) {
        _user = User.fromJson(res.data['data']);
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> logout() async {
    try {
      await _api.dio.post(ApiConstants.logout);
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    _user = null;
    notifyListeners();
  }
}
