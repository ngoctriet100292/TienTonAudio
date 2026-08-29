class Comment {
  final String id;
  final String userId;
  final String username;
  final String? userAvatarUrl;
  final String chapterId;
  final String? parentId;
  final String content;
  final int? audioTimestampSeconds;
  final bool isDeleted;
  final int replyCount;
  final String? userReaction;
  final int totalReactions;
  final DateTime createdAt;

  Comment({
    required this.id,
    required this.userId,
    required this.username,
    this.userAvatarUrl,
    required this.chapterId,
    this.parentId,
    required this.content,
    this.audioTimestampSeconds,
    this.isDeleted = false,
    this.replyCount = 0,
    this.userReaction,
    this.totalReactions = 0,
    required this.createdAt,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      username: json['username'] ?? 'Đạo hữu ẩn danh',
      userAvatarUrl: json['user_avatar_url'],
      chapterId: json['chapter_id'] ?? '',
      parentId: json['parent_id'],
      content: json['content'] ?? '',
      audioTimestampSeconds: json['audio_timestamp_seconds'],
      isDeleted: json['is_deleted'] ?? false,
      replyCount: json['reply_count'] ?? 0,
      userReaction: json['user_reaction'],
      totalReactions: json['total_reactions'] ?? 0,
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}
