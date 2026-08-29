import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/chapter_model.dart';
import '../../data/models/story_model.dart';
import '../../data/services/audio_player_service.dart';
import '../../providers/story_provider.dart';
import '../player/full_player_screen.dart';

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
      body: CustomScrollView(
        slivers: [
          // AppBar dạng Co-lapsing
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  _story.coverImageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: _story.coverImageUrl!,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) => Container(color: AppTheme.surface),
                        )
                      : Container(color: AppTheme.surface),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          AppTheme.background.withOpacity(0.8),
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
            actions: [
              IconButton(
                icon: Icon(
                  _story.isFavorite ? Icons.favorite : Icons.favorite_border,
                  color: _story.isFavorite ? Colors.redAccent : Colors.white,
                ),
                onPressed: _toggleFavorite,
              ),
              IconButton(
                icon: const Icon(Icons.share),
                onPressed: () {},
              ),
            ],
          ),

          // Nội dung chi tiết
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Tên truyện & Tác giả
                  Text(
                    _story.title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Tác giả: ${_story.authorName ?? "Đang cập nhật"}',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Thống kê: Lượt nghe, đánh giá, số chương
                  Row(
                    children: [
                      _buildMetaChip(Icons.headset, '${_story.viewCount} lượt nghe'),
                      const SizedBox(width: 8),
                      _buildMetaChip(Icons.star, '${_story.ratingAvg.toStringAsFixed(1)}/5.0'),
                      const SizedBox(width: 8),
                      _buildMetaChip(Icons.menu_book, '${_story.totalChapters} chương'),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Nút nghe ngay tập đầu
                  if (_chapters.isNotEmpty)
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        icon: const Icon(Icons.play_arrow),
                        label: const Text(
                          'PHÁT TẬP ĐẦU TIÊN',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        onPressed: () => _playChapter(context, audioService, _chapters.first),
                      ),
                    ),

                  const SizedBox(height: 20),

                  // Mô tả truyện
                  if (_story.description != null && _story.description!.isNotEmpty) ...[
                    const Text(
                      'Tóm tắt nội dung',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _story.description!,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textSecondary,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Danh sách các tập
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Danh Sách Chương (${_chapters.length})',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const Icon(Icons.sort, color: AppTheme.textMuted),
                    ],
                  ),
                  const SizedBox(height: 10),
                ],
              ),
            ),
          ),

          // Sliver List các chương truyện
          if (_isLoading)
            const SliverToBoxAdapter(
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(color: AppTheme.primary),
                ),
              ),
            )
          else if (_chapters.isEmpty)
            const SliverToBoxAdapter(
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Text('Chưa có chương nào được đăng tải'),
                ),
              ),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final chapter = _chapters[index];
                  final isCurrentPlaying = audioService.currentChapter?.id == chapter.id;

                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    decoration: BoxDecoration(
                      color: isCurrentPlaying
                          ? AppTheme.primary.withOpacity(0.1)
                          : AppTheme.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: isCurrentPlaying
                          ? Border.all(color: AppTheme.primary.withOpacity(0.4))
                          : null,
                    ),
                    child: ListTile(
                      leading: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isCurrentPlaying ? AppTheme.primary : AppTheme.surfaceLight,
                        ),
                        child: Center(
                          child: Icon(
                            isCurrentPlaying ? Icons.volume_up : Icons.play_arrow,
                            size: 18,
                            color: isCurrentPlaying ? Colors.black : Colors.white,
                          ),
                        ),
                      ),
                      title: Text(
                        chapter.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isCurrentPlaying ? FontWeight.bold : FontWeight.w500,
                          color: isCurrentPlaying ? AppTheme.primary : AppTheme.textPrimary,
                        ),
                      ),
                      subtitle: Text(
                        _formatDuration(chapter.durationSeconds),
                        style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                      ),
                      trailing: chapter.isPremium
                          ? Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.amber.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: Colors.amber),
                              ),
                              child: const Text(
                                'VIP',
                                style: TextStyle(
                                  color: Colors.amber,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            )
                          : null,
                      onTap: () => _playChapter(context, audioService, chapter),
                    ),
                  );
                },
                childCount: _chapters.length,
              ),
            ),

          if (_relatedStories.isNotEmpty) ...[
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(16, 24, 16, 12),
                child: Text(
                  'Truyện Tương Tự',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 180,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  scrollDirection: Axis.horizontal,
                  itemCount: _relatedStories.length,
                  itemBuilder: (context, idx) {
                    final item = _relatedStories[idx];
                    return GestureDetector(
                      onTap: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (_) => StoryDetailScreen(story: item),
                          ),
                        );
                      },
                      child: Container(
                        width: 110,
                        margin: const EdgeInsets.symmetric(horizontal: 6),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: item.coverImageUrl != null
                                  ? CachedNetworkImage(
                                      imageUrl: item.coverImageUrl!,
                                      height: 130,
                                      width: 110,
                                      fit: BoxFit.cover,
                                      errorWidget: (context, url, error) =>
                                          Container(color: AppTheme.surface),
                                    )
                                  : Container(color: AppTheme.surface),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              item.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.w600),
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

  Widget _buildMetaChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppTheme.primary),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }

  void _playChapter(BuildContext context, AudioPlayerService audioService, Chapter chapter) {
    audioService.loadAndPlay(story: _story, chapter: chapter);
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const FullPlayerScreen(),
      ),
    );
  }

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }
}
