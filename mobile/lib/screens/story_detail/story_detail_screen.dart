import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/chapter_model.dart';
import '../../data/models/story_model.dart';
import '../../data/services/audio_player_service.dart';
import '../../providers/story_provider.dart';
import '../player/full_player_screen.dart';
import '../reader/chapter_reader_screen.dart';

class StoryDetailScreen extends StatefulWidget {
  final Story story;

  const StoryDetailScreen({super.key, required this.story});

  @override
  State<StoryDetailScreen> createState() => _StoryDetailScreenState();
}

class _StoryDetailScreenState extends State<StoryDetailScreen> {
  late Story _story;
  List<Chapter> _chapters = [];
  List<Story> _relatedStories = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _story = widget.story;
    _loadData();
  }

  Future<void> _loadData() async {
    final storyProvider = Provider.of<StoryProvider>(context, listen: false);
    final chapters = await storyProvider.fetchChapters(_story.id);
    final related = await storyProvider.fetchRelatedStories(_story.id);

    if (mounted) {
      setState(() {
        _chapters = chapters;
        _relatedStories = related;
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleFavorite() async {
    final storyProvider = Provider.of<StoryProvider>(context, listen: false);
    final newFav = await storyProvider.toggleFavorite(_story.id);
    setState(() {
      _story = Story(
        id: _story.id,
        title: _story.title,
        slug: _story.slug,
        description: _story.description,
        coverImageUrl: _story.coverImageUrl,
        authorId: _story.authorId,
        authorName: _story.authorName,
        status: _story.status,
        viewCount: _story.viewCount,
        totalChapters: _story.totalChapters,
        ratingAvg: _story.ratingAvg,
        ratingCount: _story.ratingCount,
        favoriteCount: newFav ? _story.favoriteCount + 1 : _story.favoriteCount - 1,
        isFavorite: newFav,
        categories: _story.categories,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final audioService = Provider.of<AudioPlayerService>(context);

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: CustomScrollView(
        slivers: [
          // 1. SliverAppBar với Parallax & Blur Gradient
          SliverAppBar(
            expandedHeight: 320,
            pinned: true,
            backgroundColor: AppTheme.background,
            leading: Container(
              margin: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.5),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
                onPressed: () => Navigator.pop(context),
              ),
            ),
            actions: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.5),
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  icon: Icon(
                    _story.isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                    color: _story.isFavorite ? AppTheme.roseGlow : Colors.white,
                  ),
                  onPressed: _toggleFavorite,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                margin: const EdgeInsets.fromLTRB(0, 8, 16, 8),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.5),
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  icon: const Icon(Icons.share_rounded, size: 20),
                  onPressed: () {},
                ),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  _story.coverImageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: _story.coverImageUrl!,
                          fit: BoxFit.cover,
                          errorWidget: (context, url, error) => Container(color: AppTheme.surface),
                        )
                      : Container(color: AppTheme.surface),

                  // Lớp phủ Gradient mờ chuyển sắc xuống nền đen
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          AppTheme.background.withValues(alpha: 0.7),
                          AppTheme.background,
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 2. Phần Header Tác Phẩm
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 12),
                  // Trạng thái truyện (Hoàn thành, Tạm ngưng, Còn tiếp) & Thể loại
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: _story.statusColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: _story.statusColor.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: _story.statusColor,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _story.statusLabel,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: _story.statusColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                      ..._story.categories.map((c) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.surface,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppTheme.borderGlass),
                            ),
                            child: Text(
                              c,
                              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                            ),
                          )),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Tên truyện
                  Text(
                    _story.title,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textPrimary,
                      letterSpacing: 0.2,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '✍️ Tác giả: ${_story.authorName ?? "Đang cập nhật"}',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Hộp thống kê Glassmorphic Capsule
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.borderGlass, width: 0.8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatColumn(Icons.headset_rounded, '${_story.viewCount}', 'Lượt nghe'),
                        _buildStatDivider(),
                        _buildStatColumn(Icons.star_rounded, _story.ratingAvg.toStringAsFixed(1), 'Đánh giá'),
                        _buildStatDivider(),
                        _buildStatColumn(Icons.menu_book_rounded, '${_story.totalChapters}', 'Chương'),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Cụm nút tác vụ: Đọc truyện chữ & Nghe Audio
                  if (_chapters.isNotEmpty)
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 48,
                            decoration: BoxDecoration(
                              gradient: AppTheme.goldGradient,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.primary.withValues(alpha: 0.35),
                                  blurRadius: 15,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent,
                                shadowColor: Colors.transparent,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                              icon: const Icon(Icons.menu_book_rounded, color: Colors.black, size: 20),
                              label: const Text(
                                'ĐỌC TRUYỆN',
                                style: TextStyle(
                                  color: Colors.black,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 13,
                                ),
                              ),
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => ChapterReaderScreen(
                                      story: _story,
                                      chapter: _chapters.first,
                                      allChapters: _chapters,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            height: 48,
                            decoration: BoxDecoration(
                              color: AppTheme.surfaceLight,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppTheme.primary.withValues(alpha: 0.5)),
                            ),
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent,
                                shadowColor: Colors.transparent,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                              icon: const Icon(Icons.play_arrow_rounded, color: AppTheme.primary, size: 22),
                              label: const Text(
                                'NGHE AUDIO',
                                style: TextStyle(
                                  color: AppTheme.primary,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13,
                                ),
                              ),
                              onPressed: () => _playChapter(context, audioService, _chapters.first),
                            ),
                          ),
                        ),
                      ],
                    ),

                  const SizedBox(height: 24),

                  // Tóm tắt nội dung
                  if (_story.description != null && _story.description!.isNotEmpty) ...[
                    const Text(
                      'Tóm Tắt Tác Phẩm',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _story.description!,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textSecondary,
                        height: 1.6,
                      ),
                    ),
                    const SizedBox(height: 28),
                  ],

                  // Tiêu đề danh sách chương
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Danh Sách Chương (${_chapters.length})',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                      ),
                      const Icon(Icons.sort_rounded, color: AppTheme.textMuted, size: 20),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),

          // 3. Danh sách chương với hiệu ứng Highlight khi đang phát
          if (_isLoading)
            const SliverToBoxAdapter(
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(color: AppTheme.primary),
                ),
              ),
            )
          else if (_chapters.isEmpty)
            const SliverToBoxAdapter(
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Text('Chưa có chương nào được đăng tải'),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final chapter = _chapters[index];
                    final isCurrentPlaying = audioService.currentChapter?.id == chapter.id;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isCurrentPlaying
                            ? AppTheme.primary.withValues(alpha: 0.12)
                            : AppTheme.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isCurrentPlaying
                              ? AppTheme.primary.withValues(alpha: 0.6)
                              : AppTheme.borderGlass,
                          width: 0.8,
                        ),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                        leading: Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.surfaceLight,
                            border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.menu_book_rounded,
                              size: 18,
                              color: AppTheme.primary,
                            ),
                          ),
                        ),
                        title: Text(
                          chapter.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: isCurrentPlaying ? FontWeight.w800 : FontWeight.w600,
                            color: isCurrentPlaying ? AppTheme.primary : AppTheme.textPrimary,
                          ),
                        ),
                        subtitle: Row(
                          children: [
                            Text(
                              'Chương ${chapter.chapterNumber.toInt()}',
                              style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                            ),
                            const SizedBox(width: 6),
                            const Text('•', style: TextStyle(color: Colors.white24)),
                            const SizedBox(width: 6),
                            if (chapter.durationSeconds > 0) ...[
                              const Icon(Icons.access_time_rounded, size: 12, color: AppTheme.textMuted),
                              const SizedBox(width: 3),
                              Text(
                                _formatDuration(chapter.durationSeconds),
                                style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                              ),
                            ] else
                              const Text(
                                'Bản chữ',
                                style: TextStyle(fontSize: 12, color: AppTheme.secondary, fontWeight: FontWeight.bold),
                              ),
                          ],
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (chapter.durationSeconds > 0)
                              IconButton(
                                icon: Icon(
                                  isCurrentPlaying ? Icons.volume_up_rounded : Icons.play_circle_fill_rounded,
                                  color: isCurrentPlaying ? AppTheme.primary : Colors.white70,
                                  size: 26,
                                ),
                                onPressed: () => _playChapter(context, audioService, chapter),
                              ),
                            const Icon(Icons.chevron_right_rounded, color: Colors.white38, size: 20),
                          ],
                        ),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => ChapterReaderScreen(
                                story: _story,
                                chapter: chapter,
                                allChapters: _chapters,
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                  childCount: _chapters.length,
                ),
              ),
            ),

          // 4. Truyện tương tự gợi ý
          if (_relatedStories.isNotEmpty) ...[
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(20, 32, 20, 14),
                child: Text(
                  'Tác Phẩm Tương Tự',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 195,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  scrollDirection: Axis.horizontal,
                  itemCount: _relatedStories.length,
                  itemBuilder: (context, idx) {
                    final item = _relatedStories[idx];
                    return GestureDetector(
                      onTap: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (_) => StoryDetailScreen(story: item)),
                        );
                      },
                      child: Container(
                        width: 120,
                        margin: const EdgeInsets.symmetric(horizontal: 6),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(14),
                              child: item.coverImageUrl != null
                                  ? CachedNetworkImage(
                                      imageUrl: item.coverImageUrl!,
                                      height: 145,
                                      width: 120,
                                      fit: BoxFit.cover,
                                      errorWidget: (context, url, error) => Container(color: AppTheme.surface),
                                    )
                                  : Container(color: AppTheme.surface),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              item.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],

          const SliverToBoxAdapter(
            child: SizedBox(height: 100),
          ),
        ],
      ),
    );
  }

  Widget _buildStatColumn(IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, color: AppTheme.primary, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
        ),
      ],
    );
  }

  Widget _buildStatDivider() {
    return Container(
      width: 1,
      height: 28,
      color: AppTheme.divider,
    );
  }

  void _playChapter(BuildContext context, AudioPlayerService audioService, Chapter chapter) {
    audioService.loadAndPlay(story: _story, chapter: chapter);
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const FullPlayerScreen()),
    );
  }

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }
}
