class Chapter {
  final String id;
  final String storyId;
  final int? narratorId;
  final String? narratorName;
  final double chapterNumber;
  final String title;
  final String? content;
  final bool isPremium;
  final int durationSeconds;
  final int listenCount;
  final List<AudioFile> audioFiles;

  Chapter({
    required this.id,
    required this.storyId,
    this.narratorId,
    this.narratorName,
    required this.chapterNumber,
    required this.title,
    this.content,
    required this.isPremium,
    required this.durationSeconds,
    required this.listenCount,
    this.audioFiles = const [],
  });

  factory Chapter.fromJson(Map<String, dynamic> json) {
    return Chapter(
      id: json['id'] ?? '',
      storyId: json['story_id'] ?? '',
      narratorId: json['narrator_id'],
      narratorName: json['narrator_name'],
      chapterNumber: (json['chapter_number'] != null)
          ? double.tryParse(json['chapter_number'].toString()) ?? 1.0
          : 1.0,
      title: json['title'] ?? '',
      content: json['content'],
      isPremium: json['is_premium'] ?? false,
      durationSeconds: json['duration_seconds'] ?? 0,
      listenCount: json['listen_count'] ?? 0,
      audioFiles: (json['audio_files'] as List<dynamic>?)
              ?.map((e) => AudioFile.fromJson(e))
              .toList() ??
          [],
    );
  }
}

class AudioFile {
  final String id;
  final String quality;
  final String audioUrl;
  final bool isPrimary;

  AudioFile({
    required this.id,
    required this.quality,
    required this.audioUrl,
    required this.isPrimary,
  });

  factory AudioFile.fromJson(Map<String, dynamic> json) {
    return AudioFile(
      id: json['id'] ?? '',
      quality: json['quality'] ?? '128k',
      audioUrl: json['audio_url'] ?? '',
      isPrimary: json['is_primary'] ?? false,
    );
  }
}

class StreamUrlResult {
  final String chapterId;
  final String quality;
  final String streamUrl;
  final DateTime expiresAt;

  StreamUrlResult({
    required this.chapterId,
    required this.quality,
    required this.streamUrl,
    required this.expiresAt,
  });

  factory StreamUrlResult.fromJson(Map<String, dynamic> json) {
    return StreamUrlResult(
      chapterId: json['chapter_id'] ?? '',
      quality: json['quality'] ?? '128k',
      streamUrl: json['stream_url'] ?? '',
      expiresAt: DateTime.tryParse(json['expires_at'] ?? '') ?? DateTime.now(),
    );
  }
}
