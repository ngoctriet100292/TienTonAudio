import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _otpController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Đăng Nhập')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              Center(
                child: Container(
                  width: 70,
                  height: 70,
                  decoration: BoxDecoration(
                    color: AppTheme.primary,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.headphones, color: Colors.black, size: 40),
                ),
              ),
              const SizedBox(height: 20),
              const Center(
                child: Text(
                  'Chào mừng đạo hữu',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 4),
              const Center(
                child: Text(
                  'Đăng nhập để đồng bộ tiến độ nghe và gói VIP',
                  style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                ),
              ),
              const SizedBox(height: 32),

              if (auth.errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.redAccent.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.redAccent),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.redAccent),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          auth.errorMessage!,
                          style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),

              // Username input
              TextField(
                controller: _usernameController,
                decoration: InputDecoration(
                  labelText: 'Tên đăng nhập',
                  prefixIcon: const Icon(Icons.person_outline),
                  filled: true,
                  fillColor: AppTheme.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Password input
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Mật khẩu',
                  prefixIcon: const Icon(Icons.lock_outline),
                  filled: true,
                  fillColor: AppTheme.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Nút Đăng nhập
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: auth.isLoading
                      ? null
                      : () async {
                          final success = await auth.login(
                            _usernameController.text.trim(),
                            _passwordController.text,
                          );
                          if (!context.mounted) return;
                          if (success) {
                            if (auth.requires2FA) {
                              _show2FADialog(context, auth);
                            } else {
                              Navigator.pop(context);
                            }
                          }
                        },
                  child: auth.isLoading
                      ? const CircularProgressIndicator(color: Colors.black)
                      : const Text(
                          'ĐĂNG NHẬP',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                ),
              ),
              const SizedBox(height: 28),

              // Hoặc tiếp tục với
              Row(
                children: [
                  const Expanded(child: Divider(color: Colors.white12)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Text(
                      'HOẶC TIẾP TỤC VỚI',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                        color: AppTheme.textMuted.withValues(alpha: 0.8),
                      ),
                    ),
                  ),
                  const Expanded(child: Divider(color: Colors.white12)),
                ],
              ),
              const SizedBox(height: 20),

              // 3 Social Login Buttons
              Row(
                children: [
                  // Google
                  Expanded(
                    child: _buildSocialButton(
                      context: context,
                      label: 'Google',
                      iconWidget: Container(
                        width: 22,
                        height: 22,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                        ),
                        child: const Center(
                          child: Text(
                            'G',
                            style: TextStyle(
                              color: Color(0xFF4285F4),
                              fontWeight: FontWeight.w900,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                      onPressed: () => _handleSocialLogin(context, auth, 'google'),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Facebook
                  Expanded(
                    child: _buildSocialButton(
                      context: context,
                      label: 'Facebook',
                      iconWidget: const Icon(
                        Icons.facebook,
                        color: Color(0xFF1877F2),
                        size: 22,
                      ),
                      onPressed: () => _handleSocialLogin(context, auth, 'facebook'),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Apple
                  Expanded(
                    child: _buildSocialButton(
                      context: context,
                      label: 'Apple',
                      iconWidget: const Icon(
                        Icons.apple,
                        color: Colors.white,
                        size: 22,
                      ),
                      onPressed: () => _handleSocialLogin(context, auth, 'apple'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSocialButton({
    required BuildContext context,
    required String label,
    required Widget iconWidget,
    required VoidCallback onPressed,
  }) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            iconWidget,
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleSocialLogin(BuildContext context, AuthProvider auth, String provider) async {
    final mockProfiles = {
      'google': {
        'email': 'daohuu.google@gmail.com',
        'name': 'Tiên Tôn Google Đạo Hữu',
        'provider_user_id': 'gg_mobile_9928374',
        'avatar_url': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      },
      'facebook': {
        'email': 'daohuu.facebook@fb.com',
        'name': 'Chân Nhân Facebook',
        'provider_user_id': 'fb_mobile_8827361',
        'avatar_url': 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      },
      'apple': {
        'email': 'daohuu.apple@privaterelay.appleid.com',
        'name': 'Thiên Tôn Apple ID',
        'provider_user_id': 'apple_mobile_7736152',
        'avatar_url': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      },
    };

    final p = mockProfiles[provider]!;
    final success = await auth.socialLogin(
      provider: provider,
      email: p['email']!,
      name: p['name'],
      avatarUrl: p['avatar_url'],
      providerUserId: p['provider_user_id'],
    );

    if (success && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đăng nhập thành công qua ${provider.toUpperCase()}!'),
          backgroundColor: const Color(0xFF06D6A0),
        ),
      );
      Navigator.pop(context);
    }
  }

  void _show2FADialog(BuildContext context, AuthProvider auth) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) {
        return AlertDialog(
          backgroundColor: AppTheme.surface,
          title: const Text('Xác thực 2 bước (2FA)'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Nhập mã OTP 6 số từ ứng dụng Google Authenticator hoặc 1 mã dự phòng khẩn cấp:',
                style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.text,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 20, letterSpacing: 4, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  hintText: '000000',
                  filled: true,
                  fillColor: AppTheme.background,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
              onPressed: () async {
                final ok = await auth.verify2FA(_otpController.text.trim());
                if (!context.mounted) return;
                if (ok) {
                  Navigator.pop(context); // đóng dialog
                  Navigator.pop(context); // quay lại trang trước
                }
              },
              child: const Text('Xác nhận', style: TextStyle(color: Colors.black)),
            ),
          ],
        );
      },
    );
  }
}
