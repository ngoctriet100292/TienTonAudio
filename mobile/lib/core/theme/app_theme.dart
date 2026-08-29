import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Bảng màu Hoàng Gia Tiên Hiệp (Celestial Luxury Dark)
  static const Color background = Color(0xFF070A11);       // Đêm tuyết huyền vũ sâu thẳm
  static const Color surface = Color(0xFF0F1523);          // Nền thẻ card cao cấp
  static const Color surfaceLight = Color(0xFF182235);     // Nền nổi nhẹ
  static const Color surfaceGlass = Color(0xCC131C2E);     // Hiệu ứng kính mờ (Frosted glass)
  static const Color borderGlass = Color(0x2EFFFFFF);      // Viền kính tinh tế

  // Tông màu Hoàng Kim (Gold Champagne & Amber)
  static const Color primary = Color(0xFFFFB703);          // Vàng Kim Đan rực rỡ
  static const Color primaryLight = Color(0xFFFFD166);     // Vàng ánh kim sáng
  static const Color primaryDark = Color(0xFFD48B00);      // Vàng đồng cổ
  
  // Tông màu Bổ Trợ & Thần Khí
  static const Color secondary = Color(0xFF06D6A0);        // Ngọc bích tiên phong
  static const Color accent = Color(0xFF8B5CF6);           // Tím lôi kiếp huyền bí
  static const Color roseGlow = Color(0xFFF43F5E);         // Đỏ chu sa
  
  // Tông màu chữ Typography
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);
  static const Color divider = Color(0xFF1E293B);

  // Gradient Hoàng Kim Thần Khí
  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFFFD166), Color(0xFFFFB703), Color(0xFFD48B00)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient celestialGradient = LinearGradient(
    colors: [Color(0xFF1E293B), Color(0xFF0F172A), Color(0xFF070A11)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient heroCardGradient = LinearGradient(
    colors: [Color(0xFF24324D), Color(0xFF141D2D), Color(0xFF0B111D)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Hiệu ứng ánh sáng hào quang (Ambient Glow)
  static List<BoxShadow> glowShadow(Color color, {double opacity = 0.35, double blur = 20}) {
    return [
      BoxShadow(
        color: color.withValues(alpha: opacity),
        blurRadius: blur,
        offset: const Offset(0, 8),
      ),
    ];
  }

  static ThemeData get darkTheme {
    final baseTextTheme = GoogleFonts.plusJakartaSansTextTheme(ThemeData.dark().textTheme);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: primary,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: secondary,
        surface: surface,
        error: roseGlow,
      ),
      textTheme: baseTextTheme.copyWith(
        headlineLarge: GoogleFonts.cinzel(
          color: textPrimary,
          fontSize: 28,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.2,
        ),
        headlineMedium: GoogleFonts.plusJakartaSans(
          color: textPrimary,
          fontSize: 22,
          fontWeight: FontWeight.w700,
        ),
        titleMedium: GoogleFonts.plusJakartaSans(
          color: textPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        bodyMedium: GoogleFonts.plusJakartaSans(
          color: textSecondary,
          fontSize: 14,
        ),
        bodySmall: GoogleFonts.plusJakartaSans(
          color: textMuted,
          fontSize: 12,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: background.withValues(alpha: 0.9),
        elevation: 0,
        centerTitle: true,
        scrolledUnderElevation: 0,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
        iconTheme: const IconThemeData(color: textPrimary),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.transparent,
        selectedItemColor: primary,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0x1FFFFFFF), width: 0.8),
        ),
      ),
    );
  }
}
