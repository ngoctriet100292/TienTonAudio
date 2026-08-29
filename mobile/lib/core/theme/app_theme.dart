import 'package:flutter/material.dart';

class AppTheme {
  // Bảng màu tiên hiệp đậm chất huyền huyễn
  static const Color background = Color(0xFF090D16);
  static const Color surface = Color(0xFF131B2A);
  static const Color surfaceLight = Color(0xFF1E293B);
  
  static const Color primary = Color(0xFFF59E0B);      // Vàng kim đan
  static const Color primaryLight = Color(0xFFFBBF24);
  static const Color secondary = Color(0xFF10B981);    // Ngọc bích
  static const Color accent = Color(0xFF8B5CF6);       // Tím lôi kiếp
  
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);
  static const Color divider = Color(0xFF334155);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: primary,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: secondary,
        surface: surface,
        background: background,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        iconTheme: IconThemeData(color: textPrimary),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: primary,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0xFF1E293B)),
        ),
      ),
    );
  }
}
