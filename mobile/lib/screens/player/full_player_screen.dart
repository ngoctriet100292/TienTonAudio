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

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.keyboard_arrow_down, size: 32),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          story.title,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.timer_outlined),
            onPressed: () => _showSleepTimerDialog(context, audioService),
          ),
          IconButton(
            icon: const Icon(Icons.speed),
            onPressed: () => _showSpeedDialog(context, audioService),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            children: [
              const Spacer(),

              // Ảnh bìa truyện lớn
              Center(
                child: Container(
                  width: MediaQuery.of(context).size.width * 0.75,
                  height: MediaQuery.of(context).size.width * 0.75,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primary.withOpacity(0.2),
                        blurRadius: 30,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: story.coverImageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: story.coverImageUrl!,
                            fit: BoxFit.cover,
                            errorWidget: (_, __, ___) => _buildPlaceholder(),
                          )
                        : _buildPlaceholder(),
                  ),
                ),
              ),

              const Spacer(),

              // Tên chương & thông tin
              Align(
                alignment: Alignment.centerLeft,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      chapter.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      chapter.narratorName != null
                          ? 'MC: ${chapter.narratorName}'
                          : (story.authorName ?? 'Tiên Tôn Audio'),
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Thanh tiến độ ProgressBar
              StreamBuilder<Duration>(
                stream: player.positionStream,
                builder: (context, snapshot) {
                  final position = snapshot.data ?? Duration.zero;
                  final duration = player.duration ?? Duration.zero;
                  final buffered = player.bufferedPosition;

                  return ProgressBar(
                    progress: position,
                    buffered: buffered,
                    total: duration,
                    onSeek: (duration) => audioService.seek(duration),
                    baseBarColor: AppTheme.surfaceLight,
                    progressBarColor: AppTheme.primary,
                    bufferedBarColor: AppTheme.surfaceLight.withOpacity(0.6),
                    thumbColor: AppTheme.primary,
                    thumbRadius: 7,
                    timeLabelTextStyle: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 12,
                    ),
                  );
                },
              ),

              const SizedBox(height: 20),

              // Cụm phím điều khiển Play/Pause, Tua 15s
              StreamBuilder<PlayerState>(
                stream: player.playerStateStream,
                builder: (context, snapshot) {
                  final isPlaying = player.playing;
                  final isLoading = audioService.isLoading;

                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      // Tua lùi 10s
                      IconButton(
                        icon: const Icon(Icons.replay_10, size: 36),
                        color: AppTheme.textPrimary,
                        onPressed: () => audioService.seekRelative(-10),
                      ),

                      // Nút phát / dừng chính
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppTheme.primary,
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primary.withOpacity(0.4),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Center(
                          child: isLoading
                              ? const CircularProgressIndicator(color: Colors.black)
                              : IconButton(
                                  icon: Icon(
                                    isPlaying ? Icons.pause : Icons.play_arrow,
                                    size: 40,
                                    color: Colors.black,
                                  ),
                                  onPressed: () {
                                    if (isPlaying) {
                                      audioService.pause();
                                    } else {
                                      audioService.play();
                                    }
                                  },
                                ),
                        ),
                      ),

                      // Tua tới 10s
                      IconButton(
                        icon: const Icon(Icons.forward_10, size: 36),
                        color: AppTheme.textPrimary,
                        onPressed: () => audioService.seekRelative(10),
                      ),
                    ],
                  );
                },
              ),

              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: AppTheme.surface,
      child: const Center(
        child: Icon(Icons.headphones, color: AppTheme.primary, size: 64),
      ),
    );
  }

  void _showSpeedDialog(BuildContext context, AudioPlayerService service) {
    final speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Tốc độ đọc',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              ...speeds.map((s) => ListTile(
                    title: Text('${s}x'),
                    trailing: (service.player.speed == s)
                        ? const Icon(Icons.check, color: AppTheme.primary)
                        : null,
                    onTap: () {
                      service.setSpeed(s);
                      Navigator.pop(context);
                    },
                  )),
            ],
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
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Hẹn giờ tắt audio',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              ...options.map((opt) {
                final mins = opt['minutes'] as int;
                return ListTile(
                  title: Text(opt['label'] as String),
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
        );
      },
    );
  }
}
