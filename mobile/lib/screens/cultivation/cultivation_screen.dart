import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/cultivation_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cultivation_provider.dart';
import '../vip/vip_screen.dart';

class CultivationScreen extends StatefulWidget {
  const CultivationScreen({super.key});

  @override
  State<CultivationScreen> createState() => _CultivationScreenState();
}

class _CultivationScreenState extends State<CultivationScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  double _hoursPerDay = 2.0;
  bool _useVip = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<CultivationProvider>(context, listen: false).fetchCultivationData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final cultivationProvider = Provider.of<CultivationProvider>(context);
    final cultivation = cultivationProvider.cultivation;
    final user = auth.user;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
              ),
              child: const Icon(Icons.local_fire_department_rounded, color: AppTheme.primary, size: 20),
            ),
            const SizedBox(width: 10),
            const Text(
              'Động Phủ Tu Vi',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppTheme.textSecondary),
            onPressed: () => cultivationProvider.fetchCultivationData(),
          ),
        ],
      ),
      body: cultivationProvider.isLoading && cultivation == null
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : RefreshIndicator(
              color: AppTheme.primary,
              backgroundColor: AppTheme.surface,
              onRefresh: () => cultivationProvider.fetchCultivationData(),
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Thẻ Cảnh Giới Đạo Hữu Hiện Tại
                    _buildCurrentRealmCard(context, cultivation, user),
                    const SizedBox(height: 24),

                    // 2. Tam Đại Pháp Môn Tăng Trưởng Tu Vi
                    _buildCultivationMethods(context),
                    const SizedBox(height: 24),

                    // 3. Linh Trận Dự Báo Đột Phá (Interactive Calculator)
                    _buildBreakthroughPredictor(),
                    const SizedBox(height: 28),

                    // 4. Lộ Trình 17 Cảnh Giới Tu Tiên
                    _build17RealmsSection(cultivationProvider),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildCurrentRealmCard(BuildContext context, dynamic cultivation, dynamic user) {
    final realmName = cultivation?.currentRealm ?? user?.cultivationRealm ?? 'Luyện Khí';
    final currentExp = cultivation?.currentExp ?? user?.cultivationExp ?? 0;
    final nextExp = cultivation?.nextRealmExp ?? 60;
    final level = cultivation?.level ?? user?.cultivationLevel ?? 1;
    final progress = nextExp > 0 ? (currentExp / nextExp).clamp(0.0, 1.0) : 1.0;
    final multiplier = cultivation?.expMultiplier ?? 1.0;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF1B2438), Color(0xFF0F172A), Color(0xFF090D16)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.35), width: 1.2),
        boxShadow: AppTheme.glowShadow(AppTheme.primary, opacity: 0.15, blur: 24),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Avatar ngọn lửa cảnh giới
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  gradient: AppTheme.goldGradient,
                  boxShadow: AppTheme.glowShadow(AppTheme.primary, opacity: 0.3, blur: 16),
                ),
                child: const Icon(Icons.local_fire_department_rounded, color: Colors.black, size: 32),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          '$realmName Cảnh',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppTheme.primary.withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            'Cấp $level/17',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppTheme.primaryLight),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      cultivation?.description ?? 'Sơ nhập tiên đạo, cảm ứng thiên địa linh khí',
                      style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Thanh tiến độ kinh mạch
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Tu Vi: $currentExp EXP',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primaryLight),
              ),
              Text(
                nextExp == -1 ? 'Đỉnh Phong Viên Mãn' : 'Cần $nextExp EXP để Đột Phá',
                style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: Colors.white.withValues(alpha: 0.08),
              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
            ),
          ),
          const SizedBox(height: 16),

          // Tốc độ hấp thu linh khí & Nút VIP
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.bolt_rounded, color: AppTheme.secondary, size: 18),
                    const SizedBox(width: 6),
                    Text(
                      'Tốc độ hấp thu: ${multiplier}x',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VipScreen())),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      gradient: AppTheme.goldGradient,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      'Nạp VIP (x2)',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.black),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCultivationMethods(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Tam Đại Pháp Môn Tăng Tu Vi',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: [
              _buildMethodCard(
                icon: Icons.headphones_rounded,
                color: Colors.lightBlue,
                title: '1. Thính Âm Tụ Khí',
                desc: 'Mỗi phút nghe truyện hấp thu linh khí (+5 EXP/ping, +15 EXP/tập trọn vẹn).',
              ),
              const SizedBox(width: 12),
              _buildMethodCard(
                icon: Icons.workspace_premium_rounded,
                color: AppTheme.primary,
                title: '2. Linh Đan VIP',
                desc: 'Tặng ngay +1.500 đến +18.250 Tu Vi khi nạp VIP, x2 tốc độ tu luyện.',
                isHot: true,
              ),
              const SizedBox(width: 12),
              _buildMethodCard(
                icon: Icons.forum_rounded,
                color: Colors.purpleAccent,
                title: '3. Đàm Đạo Luận Pháp',
                desc: 'Bình luận (+5 EXP), đàm đạo cùng AI Đạo Hữu (+10 EXP), đánh giá truyện.',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMethodCard({
    required IconData icon,
    required Color color,
    required String title,
    required String desc,
    bool isHot = false,
  }) {
    return Container(
      width: 230,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isHot ? AppTheme.primary.withValues(alpha: 0.4) : Colors.white.withValues(alpha: 0.08),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              if (isHot)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppTheme.primary.withValues(alpha: 0.5)),
                  ),
                  child: const Text(
                    'HOT',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.primary),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white),
          ),
          const SizedBox(height: 6),
          Text(
            desc,
            style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildBreakthroughPredictor() {
    final expPerHour = _useVip ? 120 : 60;
    final expPerDay = _hoursPerDay * expPerHour;
    final daysToNguyenAnh = (300 / expPerDay).ceil();
    final daysToDaiThua = (15000 / expPerDay).ceil();
    final daysToTienVuong = (700000 / expPerDay).ceil();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.calculate_rounded, color: AppTheme.primary, size: 20),
              SizedBox(width: 8),
              Text(
                'Linh Trận Dự Báo Đột Phá',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Thời gian nghe audio mỗi ngày:', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              Text(
                '${_hoursPerDay.toStringAsFixed(1)} giờ/ngày',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.primaryLight),
              ),
            ],
          ),
          Slider(
            value: _hoursPerDay,
            min: 0.5,
            max: 8.0,
            divisions: 15,
            activeColor: AppTheme.primary,
            inactiveColor: Colors.white10,
            onChanged: (val) => setState(() => _hoursPerDay = val),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Kích hoạt Đan Dược VIP (x2 Tu Vi)', style: TextStyle(fontSize: 12, color: Colors.white)),
              Switch(
                value: _useVip,
                activeTrackColor: AppTheme.primary,
                onChanged: (v) => setState(() => _useVip = v),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildForecastCard('Trúc Cơ ➔ Nguyên Anh', '$daysToNguyenAnh ngày', Colors.teal),
              const SizedBox(width: 8),
              _buildForecastCard('Độ Kiếp Đại Thừa', '$daysToDaiThua ngày', Colors.amber),
              const SizedBox(width: 8),
              _buildForecastCard('Chấn Nhiếp Tiên Vương', '$daysToTienVuong ngày', Colors.purpleAccent),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildForecastCard(String title, String days, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          children: [
            Text(
              days,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: color),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _build17RealmsSection(CultivationProvider provider) {
    final realms = provider.realms;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Thập Thất Trọng Thiên (17 Cảnh Giới)',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
        ),
        const SizedBox(height: 12),
        TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primary,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.textSecondary,
          labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
          tabs: const [
            Tab(text: 'Tất Cả (17)'),
            Tab(text: 'Phàm Giới (7)'),
            Tab(text: 'Tiên Giới (6)'),
            Tab(text: 'Chí Tôn (4)'),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 380,
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildRealmsList(realms),
              _buildRealmsList(realms.where((r) => r.level <= 7).toList()),
              _buildRealmsList(realms.where((r) => r.level >= 8 && r.level <= 13).toList()),
              _buildRealmsList(realms.where((r) => r.level >= 14).toList()),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRealmsList(List<CultivationRealmInfo> list) {
    if (list.isEmpty) {
      return const Center(
        child: Text('Đang cảm ứng thiên địa linh khí...', style: TextStyle(color: AppTheme.textSecondary)),
      );
    }

    return ListView.separated(
      physics: const BouncingScrollPhysics(),
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, idx) {
        final r = list[idx];
        final hexColor = Color(int.parse(r.color.replaceFirst('#', '0xFF')));

        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: hexColor.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: hexColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: hexColor.withValues(alpha: 0.4)),
                ),
                child: Text(
                  '${r.level}',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: hexColor),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${r.name} Cảnh',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        Text(
                          r.maxExp == -1 ? '≥ 2.000.000 EXP' : '${r.minExp} - ${r.maxExp} EXP',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: hexColor),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      r.description,
                      style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
