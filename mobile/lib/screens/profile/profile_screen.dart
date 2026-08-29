import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cultivation_provider.dart';
import '../auth/login_screen.dart';
import '../vip/vip_screen.dart';
import '../ai/ai_chat_screen.dart';
import '../search/search_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final cultivationProvider = Provider.of<CultivationProvider>(context);
    final cultivation = cultivationProvider.cultivation;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Đạo Hữu Phủ Đệ',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search_rounded, color: Colors.white),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SearchScreen())),
          ),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        child: Column(
          children: [
            // 1. Thẻ Thông Tin Đạo Hữu
            _buildUserHeader(context, auth, user, cultivation),
            const SizedBox(height: 20),

            // 2. Thống Kê Tu Vi & Thời Gian Nghe
            if (auth.isAuthenticated) ...[
              _buildStatsGrid(cultivation, user),
              const SizedBox(height: 20),
            ],

            // 3. Danh Sách Tính Năng & Menu
            _buildMenuSection(context, auth),
          ],
        ),
      ),
    );
  }

  Widget _buildUserHeader(BuildContext context, AuthProvider auth, dynamic user, dynamic cultivation) {
    if (!auth.isAuthenticated) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
          boxShadow: AppTheme.glowShadow(AppTheme.primary, opacity: 0.1),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person_outline_rounded, size: 40, color: AppTheme.primary),
            ),
            const SizedBox(height: 12),
            const Text(
              'Chưa Nhập Tiên Môn',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
            ),
            const SizedBox(height: 6),
            const Text(
              'Đăng nhập để đồng bộ lịch sử nghe, tích lũy tu vi cảnh giới và thăng cấp đan dược.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
              ),
              child: const Text('Đăng Nhập / Đăng Ký', style: TextStyle(fontWeight: FontWeight.w900)),
            ),
          ],
        ),
      );
    }

    final realm = cultivation?.currentRealm ?? user?.cultivationRealm ?? 'Luyện Khí';
    final level = cultivation?.level ?? user?.cultivationLevel ?? 1;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
        boxShadow: AppTheme.glowShadow(AppTheme.primary, opacity: 0.1),
      ),
      child: Row(
        children: [
          // Avatar hào quang
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: AppTheme.goldGradient,
              boxShadow: AppTheme.glowShadow(AppTheme.primary, opacity: 0.3, blur: 16),
            ),
            padding: const EdgeInsets.all(2),
            child: Container(
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFF070A11),
              ),
              child: const Icon(Icons.person_rounded, size: 36, color: AppTheme.primaryLight),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      user?.username ?? 'Đạo Hữu',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        gradient: AppTheme.goldGradient,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'VIP',
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.black),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  user?.email ?? '',
                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.primary.withValues(alpha: 0.35)),
                  ),
                  child: Text(
                    '🔥 $realm Cảnh (Cấp $level/17)',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryLight),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(dynamic cultivation, dynamic user) {
    final exp = cultivation?.currentExp ?? user?.cultivationExp ?? 0;

    return Row(
      children: [
        _buildStatCard('Thời Gian Nghe', '48.5 giờ', Icons.headset_mic_rounded, Colors.lightBlue),
        const SizedBox(width: 10),
        _buildStatCard('Số Chương', '186 tập', Icons.auto_stories_rounded, Colors.teal),
        const SizedBox(width: 10),
        _buildStatCard('Tu Vi Tích Lũy', '$exp EXP', Icons.bolt_rounded, AppTheme.primary),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(fontSize: 9, color: AppTheme.textSecondary),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuSection(BuildContext context, AuthProvider auth) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        children: [
          _buildMenuItem(
            icon: Icons.workspace_premium_rounded,
            iconColor: AppTheme.primary,
            title: 'Hội Viên Tiên Tôn VIP',
            subtitle: 'Âm thanh 320kbps, x2 tu vi, tặng linh đan',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VipScreen())),
          ),
          _buildDivider(),
          _buildMenuItem(
            icon: Icons.smart_toy_rounded,
            iconColor: Colors.indigoAccent,
            title: 'Đàm Đạo Cùng AI Đạo Hữu',
            subtitle: 'Trợ lý AI phân tích cốt truyện tiên hiệp 24/7',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AiChatScreen())),
          ),
          _buildDivider(),
          _buildMenuItem(
            icon: Icons.search_rounded,
            iconColor: Colors.cyan,
            title: 'Tìm Kiếm & Khám Phá Thể Loại',
            subtitle: 'Tra cứu tàng kinh các theo tác giả, cảnh giới',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SearchScreen())),
          ),
          _buildDivider(),
          _buildMenuItem(
            icon: Icons.shield_rounded,
            iconColor: Colors.teal,
            title: 'Bảo Mật & Xác Thực 2FA',
            subtitle: 'Bảo vệ đan điền và tài khoản an toàn',
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Tính năng bảo mật 2FA đang đồng bộ với tiên môn.')),
              );
            },
          ),
          _buildDivider(),
          _buildMenuItem(
            icon: Icons.info_outline_rounded,
            iconColor: Colors.blueGrey,
            title: 'Về Tiên Tôn Audio',
            subtitle: 'Sứ mệnh, bản quyền DMCA & studio 320kbps',
            onTap: () {
              showAboutDialog(
                context: context,
                applicationName: 'Tiên Tôn Audio',
                applicationVersion: '1.0.0 (320kbps)',
                applicationLegalese: '© 2026 Tiên Tôn Audio. All rights reserved.',
              );
            },
          ),
          if (auth.isAuthenticated) ...[
            _buildDivider(),
            _buildMenuItem(
              icon: Icons.logout_rounded,
              iconColor: Colors.redAccent,
              title: 'Đăng Xuất Tiên Môn',
              subtitle: 'Thoát tài khoản khỏi thiết bị hiện tại',
              onTap: () async {
                await auth.logout();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Đã đăng xuất tài khoản thành công!')),
                  );
                }
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: iconColor, size: 22),
      ),
      title: Text(
        title,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
      ),
      trailing: const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted, size: 20),
    );
  }

  Widget _buildDivider() {
    return Divider(height: 1, thickness: 1, color: Colors.white.withValues(alpha: 0.05), indent: 64);
  }
}
