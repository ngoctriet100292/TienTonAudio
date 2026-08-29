import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class VipScreen extends StatefulWidget {
  const VipScreen({super.key});

  @override
  State<VipScreen> createState() => _VipScreenState();
}

class _VipScreenState extends State<VipScreen> {
  int _selectedPlanIndex = 1; // Mặc định gói Kim Đan 90 ngày

  final List<Map<String, dynamic>> _plans = [
    {
      'name': 'Gói Đồng Đan',
      'duration': '30 Ngày',
      'price': '49.000đ',
      'daily': '~1.600đ/ngày',
      'bonusExp': '+1.500 Tu Vi',
      'tag': null,
    },
    {
      'name': 'Gói Kim Đan',
      'duration': '90 Ngày',
      'price': '129.000đ',
      'daily': '~1.400đ/ngày',
      'bonusExp': '+4.500 Tu Vi',
      'tag': 'Đạo Hữu Khuyên Dùng',
    },
    {
      'name': 'Gói Tiên Vương',
      'duration': '365 Ngày',
      'price': '499.000đ',
      'daily': '~1.300đ/ngày',
      'bonusExp': '+18.250 Tu Vi',
      'tag': 'Tiết Kiệm 40%',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Đặc Quyền Hội Viên VIP',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Colors.white),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Banner Tiên Tôn VIP
            _buildVipHeroBanner(),
            const SizedBox(height: 24),

            // Các Gói VIP
            const Text(
              'Chọn Gói Tu Tiên Đột Phá',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
            ),
            const SizedBox(height: 12),
            ...List.generate(_plans.length, (index) => _buildPlanCard(index)),
            const SizedBox(height: 24),

            // Danh sách đặc quyền VIP
            const Text(
              'Đại Đặc Quyền Đạo Hữu VIP',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
            ),
            const SizedBox(height: 12),
            _buildPrivilegesGrid(),
            const SizedBox(height: 32),

            // Nút Đăng Ký Đột Phá
            GestureDetector(
              onTap: () {
                final plan = _plans[_selectedPlanIndex];
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Đang khởi tạo linh trận thanh toán cho ${plan["name"]}!'),
                    backgroundColor: AppTheme.primary,
                  ),
                );
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  gradient: AppTheme.goldGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: AppTheme.glowShadow(AppTheme.primary, opacity: 0.4, blur: 20),
                ),
                alignment: Alignment.center,
                child: Text(
                  'Đột Phá VIP Ngay • ${_plans[_selectedPlanIndex]["price"]}',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.black),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVipHeroBanner() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF2C220E), Color(0xFF191408), Color(0xFF0F0D05)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.4)),
        boxShadow: AppTheme.glowShadow(AppTheme.primary, opacity: 0.15, blur: 24),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: AppTheme.goldGradient,
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.workspace_premium_rounded, color: Colors.black, size: 34),
          ),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'TIÊN TÔN VIP CLUB',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.primaryLight),
                ),
                SizedBox(height: 4),
                Text(
                  'Âm thanh 320kbps • x2 Tu Vi • Đan Dược Đột Phá • Không Quảng Cáo',
                  style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanCard(int index) {
    final plan = _plans[index];
    final isSelected = _selectedPlanIndex == index;

    return GestureDetector(
      onTap: () => setState(() => _selectedPlanIndex = index),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withValues(alpha: 0.1) : AppTheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppTheme.primary : Colors.white.withValues(alpha: 0.08),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppTheme.primary : AppTheme.textMuted,
                  width: 2,
                ),
                color: isSelected ? AppTheme.primary : Colors.transparent,
              ),
              child: isSelected ? const Icon(Icons.check, size: 14, color: Colors.black) : null,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        plan['name'],
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                      const SizedBox(width: 8),
                      if (plan['tag'] != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            gradient: AppTheme.goldGradient,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            plan['tag'],
                            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.black),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        'Thời hạn ${plan["duration"]}',
                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          plan['bonusExp'],
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primaryLight),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  plan['price'],
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppTheme.primaryLight),
                ),
                Text(
                  plan['daily'],
                  style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPrivilegesGrid() {
    final privileges = [
      {'icon': Icons.audiotrack_rounded, 'title': 'Âm Thanh 320kbps', 'desc': 'Chất lượng phòng thu chuẩn cao nhất'},
      {'icon': Icons.block_flipped, 'title': '100% Không Quảng Cáo', 'desc': 'Nghe liền mạch không bị đứt đoạn'},
      {'icon': Icons.bolt_rounded, 'title': 'x2 Tốc Độ Tu Luyện', 'desc': 'Nhân đôi điểm Tu Vi mỗi phút nghe truyện'},
      {'icon': Icons.medication_rounded, 'title': 'Tặng Linh Đan Đột Phá', 'desc': 'Cộng thẳng tới +18.250 Tu Vi khi gia hạn'},
      {'icon': Icons.download_rounded, 'title': 'Tải Về Ngoại Tuyến', 'desc': 'Nghe offline trên máy bay, không có mạng'},
      {'icon': Icons.verified_rounded, 'title': 'Huy Hiệu Kim Thân', 'desc': 'Hào quang nổi bật trong cộng đồng'},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        children: privileges.map((p) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(p['icon'] as IconData, color: AppTheme.primary, size: 20),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p['title'] as String,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      Text(
                        p['desc'] as String,
                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
