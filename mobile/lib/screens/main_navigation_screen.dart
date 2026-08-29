import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'home/home_screen.dart';
import 'player/mini_player_widget.dart';
import 'cultivation/cultivation_screen.dart';
import 'library/library_screen.dart';
import 'profile/profile_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    HomeScreen(),
    CultivationScreen(),
    LibraryScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        children: [
          IndexedStack(
            index: _currentIndex,
            children: _screens,
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
                      _buildNavItem(1, Icons.local_fire_department_rounded, Icons.local_fire_department_outlined, 'Cảnh Giới'),
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
              color: isSelected ? AppTheme.primary : AppTheme.textMuted,
              size: 24,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
              color: isSelected ? AppTheme.primaryLight : AppTheme.textMuted,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
