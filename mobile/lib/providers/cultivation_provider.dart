import 'package:flutter/material.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../data/models/cultivation_model.dart';

class CultivationProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  UserCultivation? _cultivation;
  List<CultivationRealmInfo> _realms = [];
  bool _isLoading = false;
  String? _errorMessage;

  UserCultivation? get cultivation => _cultivation;
  List<CultivationRealmInfo> get realms => _realms;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchCultivationData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.dio.get(ApiConstants.cultivation);
      if (res.statusCode == 200 && res.data != null) {
        _cultivation = UserCultivation.fromJson(res.data as Map<String, dynamic>);
      }
    } catch (e) {
      _errorMessage = 'Không thể tải thông tin tu vi: $e';
    }

    try {
      if (_realms.isEmpty) {
        final realmsRes = await _api.dio.get(ApiConstants.cultivationRealms);
        if (realmsRes.statusCode == 200 && realmsRes.data != null) {
          final items = realmsRes.data['items'] as List<dynamic>? ?? realmsRes.data as List<dynamic>? ?? [];
          _realms = items
              .map((e) => CultivationRealmInfo.fromJson(e as Map<String, dynamic>))
              .toList();
        }
      }
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }
}
