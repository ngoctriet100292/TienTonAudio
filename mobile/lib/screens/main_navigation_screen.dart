import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import 'home/home_screen.dart';
import 'player/mini_player_widget.dart';
import 'auth/login_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    final screens = [
      const HomeScreen(),
      const _PlaceholderScreen(title: 'Khám Phá Cảnh Giới', icon: Icons.explore_rounded),
      const _PlaceholderScreen(title: 'Tủ Truyện Cá Nhân', icon: Icons.local_library_rounded),
      _buildProfileTab(context, auth),
    ];

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        children: [
          IndexedStack(
            index: _currentIndex,
            children: screens,
          ),

          // Mini Player nổi ở vị trí cố định trên thanh TabBar
          const Positioned(
            left: 0,
            right: 0,
            bottom: 74,
            child: MiniPlayerWidget(),
          ),

          // Thanh Bottom Navigation Kính Mờ (Glassmorphic)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: ClipRRect(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: Container(
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceGlass,
                    border: Border(
                      top: BorderSide(
                        color: AppTheme.borderGlass,
                        width: 0.8,
                      ),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildNavItem(0, Icons.home_rounded, Icons.home_outlined, 'Trang Chủ'),
                      _buildNavItem(1, Icons.explore_rounded, Icons.explore_outlined, 'Khám Phá'),
                      _buildNavItem(2, Icons.local_library_rounded, Icons.local_library_outlined, 'Tủ Truyện'),
                      _buildNavItem(3, Icons.person_rounded, Icons.person_outline_rounded, 'Cá Nhân'),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData activeIcon, IconData inactiveIcon, String label) {
    final isSelected = _currentIndex == index;

    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: isSelected ? AppTheme.primary.withValues(alpha: 0.15) : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              isSelected ? activeIcon : inactiveIcon,
              size: 24,
              color: isSelected ? AppTheme.primary : AppTheme.textMuted,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
              color: isSelected ? AppTheme.primary : AppTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileTab(BuildContext context, AuthProvider auth) {
    if (!auth.isAuthenticated) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(title: const Text('Tài Khoản')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.surfaceLight,
                    border: Border.all(color: AppTheme.primary.withValues(alpha: 0.4), width: 1.5),
                  ),
                  child: const Icon(Icons.person_rounded, size: 50, color: AppTheme.primary),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Gia Nhập Tiên Tôn Các',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Đăng nhập để đồng bộ lịch sử tu luyện, lưu truyện yêu thích và tận hưởng gói VIP không quảng cáo.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.5),
                ),
                const SizedBox(height: 28),
                Container(
                  decoration: BoxDecoration(
                    gradient: AppTheme.goldGradient,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: AppTheme.glowShadow(AppTheme.primary),
                  ),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const LoginScreen()),
                      );
                    },
                    child: const Text(
                      'ĐĂNG NHẬP / ĐĂNG KÝ',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.black),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final user = auth.user!;
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Hồ Sơ Đạo Hữu')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 120),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.borderGlass, width: 0.8),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppTheme.primary,
                  child: Text(
                    user.username.isNotEmpty ? user.username[0].toUpperCase() : 'U',
                    style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 22),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.username, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                      const SizedBox(height: 2),
                      Text(user.email, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    gradient: user.role == 'admin' ? null : AppTheme.goldGradient,
                    color: user.role == 'admin' ? AppTheme.roseGlow : null,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    user.role.toUpperCase(),
                    style: TextStyle(
                      color: user.role == 'admin' ? Colors.white : Colors.black,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          _buildProfileTile(Icons.shield_outlined, 'Bảo mật 2 bước (2FA)', user.twoFactorEnabled ? 'Đang kích hoạt' : 'Chưa bật'),
          _buildProfileTile(Icons.diamond_outlined, 'Đặc Quyền Hội Viên VIP', 'Trải nghiệm âm thanh không giới hạn'),
          _buildProfileTile(Icons.history_rounded, 'Lịch Sử Tu Luyện', 'Xem lại các chương đã nghe'),
          _buildProfileTile(Icons.download_for_offline_outlined, 'Tải Xuống Ngoại Tuyến', 'Quản lý tập đã tải'),
          const SizedBox(height: 12),
          _buildProfileTile(Icons.logout_rounded, 'Đăng Xuất', 'Rời khỏi tài khoản', isDestructive: true, onTap: () => auth.logout()),
        ],
      ),
    );
  }

  Widget _buildProfileTile(IconData icon, String title, String subtitle, {bool isDestructive = false, VoidCallback? onTap}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderGlass, width: 0.8),
      ),
      child: ListTile(
        leading: Icon(icon, color: isDestructive ? AppTheme.roseGlow : AppTheme.primary),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: isDestructive ? AppTheme.roseGlow : AppTheme.textPrimary)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppTheme.textMuted),
        onTap: onTap,
      ),
    );
  }
}

class _PlaceholderScreen extends StatelessWidget {
  final String title;
  final IconData icon;

  const _PlaceholderScreen({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.surfaceLight,
                border: Border.all(color: AppTheme.borderGlass),
              ),
              child: Icon(icon, size: 40, color: AppTheme.primary),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            ),
          ],
        ),
      ),
    );
  }
}
