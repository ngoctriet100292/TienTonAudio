import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:audio_video_progress_bar/audio_video_progress_bar.dart';
import 'package:just_audio/just_audio.dart';
import '../../core/theme/app_theme.dart';
import '../../data/services/audio_player_service.dart';

class FullPlayerScreen extends StatelessWidget {
  const FullPlayerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final audioService = Provider.of<AudioPlayerService>(context);

    if (!audioService.hasActiveTrack) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('Không có tập nào đang phát')),
      );
    }

    final story = audioService.currentStory!;
    final chapter = audioService.currentChapter!;
    final player = audioService.player;
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        children: [
          // 1. Hiệu ứng Hào Quang Ambient Background (Apple Music Style)
          Positioned(
            top: size.height * 0.15,
            left: size.width * 0.1,
            child: Container(
              width: size.width * 0.8,
              height: size.width * 0.8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primary.withValues(alpha: 0.18),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.accent.withValues(alpha: 0.15),
                    blurRadius: 100,
                    spreadRadius: 30,
                  ),
                ],
              ),
            ),
          ),

          // Lớp kính mờ toàn màn hình tạo độ sâu trường ảnh
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
              child: Container(color: Colors.black.withValues(alpha: 0.4)),
            ),
          ),

          // 2. Giao diện chính của Full Player
          SafeArea(
            child: Column(
              children: [
                // Thanh Header Glassmorphic
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Nút thu nhỏ player
                      _buildHeaderButton(
                        icon: Icons.keyboard_arrow_down_rounded,
                        size: 30,
                        onTap: () => Navigator.of(context).pop(),
                      ),

                      // Tiêu đề truyện trung tâm
                      Expanded(
                        child: Column(
                          children: [
                            const Text(
                              'ĐANG PHÁT AUDIO',
                              style: TextStyle(
                                color: AppTheme.primary,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              story.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Nút Hẹn giờ tắt & Tốc độ đọc
                      Row(
                        children: [
                          _buildHeaderButton(
                            icon: Icons.timer_outlined,
                            size: 20,
                            isActive: audioService.sleepDurationLeft != null,
                            onTap: () => _showSleepTimerDialog(context, audioService),
                          ),
                          const SizedBox(width: 8),
                          _buildHeaderButton(
                            icon: Icons.speed_rounded,
                            size: 20,
                            onTap: () => _showSpeedDialog(context, audioService),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const Spacer(flex: 2),

                // 3. Ảnh bìa Album Cover Nghệ Thuật (Floating Squircle 3D)
                Hero(
                  tag: 'cover_${chapter.id}',
                  child: Container(
                    width: size.width * 0.76,
                    height: size.width * 0.76,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.7),
                          blurRadius: 35,
                          offset: const Offset(0, 18),
                        ),
                        BoxShadow(
                          color: AppTheme.primary.withValues(alpha: 0.3),
                          blurRadius: 30,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(28),
                          child: story.coverImageUrl != null
                              ? CachedNetworkImage(
                                  imageUrl: story.coverImageUrl!,
                                  fit: BoxFit.cover,
                                  width: double.infinity,
                                  height: double.infinity,
                                  errorWidget: (context, url, error) => _buildPlaceholder(),
                                )
                              : _buildPlaceholder(),
                        ),
                        // Viền kim loại mảnh phản chiếu
                        Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(
                              color: AppTheme.primary.withValues(alpha: 0.35),
                              width: 1.2,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const Spacer(flex: 3),

                // 4. Thông tin chương & Trạng thái phát
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              chapter.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.2,
                                height: 1.25,
                              ),
                            ),
                          ),
                          // Nút yêu thích nhanh
                          IconButton(
                            icon: Icon(
                              story.isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                              color: story.isFavorite ? AppTheme.roseGlow : AppTheme.textSecondary,
                              size: 26,
                            ),
                            onPressed: () {},
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        chapter.narratorName != null
                            ? '🎙️ Giọng đọc: ${chapter.narratorName}'
                            : '✍️ Tác giả: ${story.authorName ?? "Tiên Tôn Audio"}',
                        style: const TextStyle(
                          color: AppTheme.primaryLight,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // 5. Thanh trượt thời lượng (Audio Scrub Bar)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  child: StreamBuilder<Duration>(
                    stream: player.positionStream,
                    builder: (context, snapshot) {
                      final position = snapshot.data ?? Duration.zero;
                      final duration = player.duration ?? Duration.zero;
                      final buffered = player.bufferedPosition;

                      return ProgressBar(
                        progress: position,
                        buffered: buffered,
                        total: duration,
                        onSeek: (d) => audioService.seek(d),
                        baseBarColor: AppTheme.surfaceLight.withValues(alpha: 0.6),
                        progressBarColor: AppTheme.primary,
                        bufferedBarColor: AppTheme.surfaceLight.withValues(alpha: 0.3),
                        thumbColor: AppTheme.primaryLight,
                        thumbGlowColor: AppTheme.primary.withValues(alpha: 0.4),
                        thumbRadius: 8,
                        barHeight: 5,
                        timeLabelTextStyle: const TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 16),

                // 6. Cụm điều khiển Hoàng Kim (Play/Pause, Tua 10s)
                StreamBuilder<PlayerState>(
                  stream: player.playerStateStream,
                  builder: (context, snapshot) {
                    final isPlaying = player.playing;
                    final isLoading = audioService.isLoading;

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          // Tua lùi 10s
                          _buildControlCircle(
                            icon: Icons.replay_10_rounded,
                            size: 28,
                            onTap: () => audioService.seekRelative(-10),
                          ),

                          // Nút phát chính Hoàng Kim (King Play Button)
                          Container(
                            width: 78,
                            height: 78,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: AppTheme.goldGradient,
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.primary.withValues(alpha: 0.5),
                                  blurRadius: 25,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                customBorder: const CircleBorder(),
                                onTap: () {
                                  if (isPlaying) {
                                    audioService.pause();
                                  } else {
                                    audioService.play();
                                  }
                                },
                                child: Center(
                                  child: isLoading
                                      ? const CircularProgressIndicator(color: Colors.black, strokeWidth: 3)
                                      : Icon(
                                          isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                                          size: 46,
                                          color: Colors.black,
                                        ),
                                ),
                              ),
                            ),
                          ),

                          // Tua tới 10s
                          _buildControlCircle(
                            icon: Icons.forward_10_rounded,
                            size: 28,
                            onTap: () => audioService.seekRelative(10),
                          ),
                        ],
                      ),
                    );
                  },
                ),

                const Spacer(flex: 2),

                // 7. Thanh tiện ích phía đáy (Bình luận, Playlist, Chất lượng)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildBottomChip(Icons.chat_bubble_outline_rounded, 'Bình luận', () {}),
                      _buildBottomChip(Icons.playlist_play_rounded, 'Tập tiếp theo', () {}),
                      _buildBottomChip(Icons.hd_outlined, '128k', () {}),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderButton({
    required IconData icon,
    required double size,
    bool isActive = false,
    required VoidCallback onTap,
  }) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: isActive ? AppTheme.primary.withValues(alpha: 0.2) : AppTheme.surfaceLight.withValues(alpha: 0.6),
        shape: BoxShape.circle,
        border: Border.all(
          color: isActive ? AppTheme.primary : AppTheme.borderGlass,
          width: 1,
        ),
      ),
      child: IconButton(
        padding: EdgeInsets.zero,
        icon: Icon(icon, size: size, color: isActive ? AppTheme.primary : AppTheme.textPrimary),
        onPressed: onTap,
      ),
    );
  }

  Widget _buildControlCircle({
    required IconData icon,
    required double size,
    required VoidCallback onTap,
  }) {
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: AppTheme.surfaceLight.withValues(alpha: 0.7),
        shape: BoxShape.circle,
        border: Border.all(color: AppTheme.borderGlass, width: 1),
      ),
      child: IconButton(
        padding: EdgeInsets.zero,
        icon: Icon(icon, size: size, color: AppTheme.textPrimary),
        onPressed: onTap,
      ),
    );
  }

  Widget _buildBottomChip(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.surfaceLight.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.borderGlass, width: 0.8),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: AppTheme.primaryLight),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: AppTheme.surface,
      child: const Center(
        child: Icon(Icons.headphones_rounded, color: AppTheme.primary, size: 64),
      ),
    );
  }

  void _showSpeedDialog(BuildContext context, AudioPlayerService service) {
    final speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppTheme.divider,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const Text(
                  'Tốc Độ Đọc Truyện',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: speeds.map((s) {
                    final isSelected = service.player.speed == s;
                    return ChoiceChip(
                      label: Text('${s}x'),
                      selected: isSelected,
                      selectedColor: AppTheme.primary,
                      backgroundColor: AppTheme.surfaceLight,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.black : AppTheme.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                      onSelected: (_) {
                        service.setSpeed(s);
                        Navigator.pop(context);
                      },
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showSleepTimerDialog(BuildContext context, AudioPlayerService service) {
    final options = [
      {'label': 'Tắt hẹn giờ', 'minutes': 0},
      {'label': '15 phút', 'minutes': 15},
      {'label': '30 phút', 'minutes': 30},
      {'label': '45 phút', 'minutes': 45},
      {'label': '60 phút', 'minutes': 60},
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppTheme.divider,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const Text(
                  'Hẹn Giờ Tắt Audio Khi Ngủ',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 16),
                ...options.map((opt) {
                  final mins = opt['minutes'] as int;
                  return ListTile(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    title: Text(opt['label'] as String, style: const TextStyle(fontWeight: FontWeight.w600)),
                    trailing: (mins > 0 && service.sleepDurationLeft != null && service.sleepDurationLeft!.inMinutes == mins)
                        ? const Icon(Icons.check_circle_rounded, color: AppTheme.primary)
                        : null,
                    onTap: () {
                      if (mins == 0) {
                        service.cancelSleepTimer();
                      } else {
                        service.setSleepTimer(Duration(minutes: mins));
                      }
                      Navigator.pop(context);
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }
}
