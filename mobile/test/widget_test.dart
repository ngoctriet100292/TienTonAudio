import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tientonaudio_mobile/core/theme/app_theme.dart';
import 'package:tientonaudio_mobile/data/models/story_model.dart';
import 'package:tientonaudio_mobile/data/models/chapter_model.dart';

void main() {
  test('Story model JSON parsing test', () {
    final json = {
      'id': 'test-story-1',
      'title': 'Phàm Nhân Tu Tiên',
      'slug': 'pham-nhan-tu-tien',
      'view_count': 5000,
      'total_chapters': 200,
      'rating_avg': 4.9,
      'rating_count': 85,
      'status': 'ongoing',
      'categories': ['Tiên Hiệp', 'Tu Chân'],
    };

    final story = Story.fromJson(json);
    expect(story.id, 'test-story-1');
    expect(story.title, 'Phàm Nhân Tu Tiên');
    expect(story.ratingAvg, 4.9);
    expect(story.viewCount, 5000);
    expect(story.categories.length, 2);
  });

  test('Chapter model JSON parsing test', () {
    final json = {
      'id': 'ch-1',
      'story_id': 'test-story-1',
      'chapter_number': 1.0,
      'title': 'Chương 1: Sơn Thôn Thiếu Niên',
      'is_premium': false,
      'duration_seconds': 1200,
      'listen_count': 320,
    };

    final chapter = Chapter.fromJson(json);
    expect(chapter.id, 'ch-1');
    expect(chapter.chapterNumber, 1.0);
    expect(chapter.isPremium, false);
    expect(chapter.durationSeconds, 1200);
  });

  test('AppTheme darkTheme initialization test', () {
    final theme = AppTheme.darkTheme;
    expect(theme.brightness, Brightness.dark);
    expect(theme.primaryColor, AppTheme.primary);
  });
}
