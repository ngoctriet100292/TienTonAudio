import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/story_provider.dart';
import '../story_detail/story_detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _query = '';
  String _selectedCategory = 'Tất cả';
  String _selectedStatus = 'Tất cả';

  final List<String> _categories = [
    'Tất cả',
    'Tiên Hiệp',
    'Huyền Huyễn',
    'Trùng Sinh',
    'Kiếm Hiệp',
    'Đô Thị',
    'Khoa Huyễn',
  ];

  final List<String> _statuses = [
    'Tất cả',
    'Hoàn thành',
    'Còn tiếp',
    'Tạm ngưng',
  ];

  final List<String> _trendingKeywords = [
    'Phàm Nhân Tu Tiên',
    'Già Thiên',
    'Thế Giới Hoàn Mỹ',
    'Đấu Phá Thương Khung',
    'Mục Thần Ký',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final storyProvider = Provider.of<StoryProvider>(context);
    final allStories = [...storyProvider.recentStories, ...storyProvider.topViews];

    // Lọc theo từ khóa, thể loại và trạng thái
    final filteredStories = allStories.where((s) {
      final matchesQuery = _query.isEmpty ||
          s.title.toLowerCase().contains(_query.toLowerCase()) ||
          (s.authorName?.toLowerCase().contains(_query.toLowerCase()) ?? false);
      final matchesStatus = _selectedStatus == 'Tất cả' ||
          s.statusLabel.toLowerCase() == _selectedStatus.toLowerCase();
      return matchesQuery && matchesStatus;
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Container(
          height: 40,
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
          ),
          child: TextField(
            controller: _searchController,
            style: const TextStyle(fontSize: 13, color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Tìm truyện, tác giả, dịch giả...',
              hintStyle: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
              prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.textSecondary, size: 18),
              suffixIcon: _query.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, color: AppTheme.textSecondary, size: 16),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _query = '');
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
            onChanged: (val) => setState(() => _query = val),
          ),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thể loại Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: _categories.map((cat) {
                  final isSelected = _selectedCategory == cat;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(cat),
                      selected: isSelected,
                      selectedColor: AppTheme.primary,
                      backgroundColor: AppTheme.surface,
                      labelStyle: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.black : AppTheme.textSecondary,
                      ),
                      side: BorderSide(
                        color: isSelected ? AppTheme.primary : Colors.white.withValues(alpha: 0.08),
                      ),
                      onSelected: (selected) {
                        setState(() => _selectedCategory = cat);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 8),

            // Trạng thái Truyện Chips (Hoàn thành, Còn tiếp, Tạm ngưng)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: _statuses.map((status) {
                  final isSelected = _selectedStatus == status;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(status),
                      selected: isSelected,
                      selectedColor: AppTheme.primary,
                      backgroundColor: AppTheme.surface,
                      labelStyle: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.black : AppTheme.textSecondary,
                      ),
                      side: BorderSide(
                        color: isSelected ? AppTheme.primary : Colors.white.withValues(alpha: 0.08),
                      ),
                      onSelected: (selected) {
                        setState(() => _selectedStatus = status);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Từ khóa tìm kiếm nhiều (khi chưa nhập text)
            if (_query.isEmpty) ...[
              const Text(
                'Từ Khóa Thịnh Hành',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _trendingKeywords.map((kw) {
                  return GestureDetector(
                    onTap: () {
                      _searchController.text = kw;
                      setState(() => _query = kw);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                      ),
                      child: Text(
                        '🔥 $kw',
                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
            ],

            // Kết quả tìm kiếm
            Text(
              _query.isEmpty ? 'Tác Phẩm Đề Cử' : 'Kết Quả (${filteredStories.length})',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
            ),
            const SizedBox(height: 12),

            if (filteredStories.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: const [
                      Icon(Icons.search_off_rounded, size: 48, color: AppTheme.textMuted),
                      SizedBox(height: 12),
                      Text(
                        'Không tìm thấy tác phẩm phù hợp',
                        style: TextStyle(fontSize: 14, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filteredStories.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, idx) {
                  final story = filteredStories[idx];
                  return GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => StoryDetailScreen(story: story)),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
                      ),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: CachedNetworkImage(
                              imageUrl: story.coverImageUrl ?? '',
                              width: 50,
                              height: 65,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => Container(color: const Color(0xFF1E293B)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  story.title,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  story.authorName ?? 'Tiên Tôn Audio',
                                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: story.statusColor.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(5),
                                        border: Border.all(color: story.statusColor.withValues(alpha: 0.4)),
                                      ),
                                      child: Text(
                                        story.statusLabel,
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: story.statusColor,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.headphones_rounded, size: 12, color: AppTheme.primaryLight),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${story.viewCount} lượt nghe',
                                      style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted, size: 20),
                        ],
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
