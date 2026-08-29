class Story {
  final String id;
  final String title;
  final String slug;
  final String? description;
  final String? coverImageUrl;
  final int? authorId;
  final String? authorName;
  final String status;
  final int viewCount;
  final int totalChapters;
  final double ratingAvg;
  final int ratingCount;
  final int favoriteCount;
  final bool isFavorite;
  final List<String> categories;

  Story({
    required this.id,
    required this.title,
    required this.slug,
    this.description,
    this.coverImageUrl,
    this.authorId,
    this.authorName,
    required this.status,
    required this.viewCount,
    required this.totalChapters,
    required this.ratingAvg,
    required this.ratingCount,
    this.favoriteCount = 0,
    this.isFavorite = false,
    this.categories = const [],
  });

  factory Story.fromJson(Map<String, dynamic> json) {
    return Story(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description'],
      coverImageUrl: json['cover_image_url'],
      authorId: json['author_id'],
      authorName: json['author_name'],
      status: json['status'] ?? 'ongoing',
      viewCount: json['view_count'] ?? 0,
      totalChapters: json['total_chapters'] ?? 0,
      ratingAvg: (json['rating_avg'] != null)
          ? double.tryParse(json['rating_avg'].toString()) ?? 0.0
          : 0.0,
      ratingCount: json['rating_count'] ?? 0,
      favoriteCount: json['favorite_count'] ?? 0,
      isFavorite: json['is_favorite'] ?? false,
      categories: (json['categories'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }
}
