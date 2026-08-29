import 'package:flutter/material.dart';

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

  String get statusLabel {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Hoàn thành';
      case 'paused':
      case 'dropped':
        return 'Tạm ngưng';
      case 'ongoing':
      default:
        return 'Còn tiếp';
    }
  }

  Color get statusColor {
    switch (status.toLowerCase()) {
      case 'completed':
        return const Color(0xFF06D6A0);
      case 'paused':
      case 'dropped':
        return const Color(0xFFF43F5E);
      case 'ongoing':
      default:
        return const Color(0xFFFFB703);
    }
  }

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
