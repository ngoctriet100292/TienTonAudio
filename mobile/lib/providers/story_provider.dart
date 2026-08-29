import 'package:flutter/foundation.dart';
import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../data/models/chapter_model.dart';
import '../data/models/story_model.dart';

class StoryProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  List<Story> _topViews = [];
  List<Story> _recentStories = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<Story> get topViews => _topViews;
  List<Story> get recentStories => _recentStories;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchHomeData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // 1. Fetch Top Views
      final topRes = await _api.dio.get(
        ApiConstants.topViews,
        queryParameters: {'limit': 6},
      );
      if (topRes.statusCode == 200 && topRes.data['success'] == true) {
        final list = topRes.data['data'] as List<dynamic>;
        _topViews = list.map((e) => Story.fromJson(e)).toList();
      }

      // 2. Fetch Recent Stories
      final storiesRes = await _api.dio.get(
        ApiConstants.stories,
        queryParameters: {'limit': 10},
      );
      if (storiesRes.statusCode == 200 && storiesRes.data['success'] == true) {
        final list = storiesRes.data['data'] as List<dynamic>;
        _recentStories = list.map((e) => Story.fromJson(e)).toList();
      }
    } catch (e) {
      _errorMessage = 'Không thể tải dữ liệu: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<List<Chapter>> fetchChapters(String storyId) async {
    try {
      final res = await _api.dio.get('${ApiConstants.stories}/$storyId/chapters');
      if (res.statusCode == 200 && res.data['success'] == true) {
        final list = res.data['data'] as List<dynamic>;
        return list.map((e) => Chapter.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<List<Story>> fetchRelatedStories(String storyId) async {
    try {
      final res = await _api.dio.get(
        '${ApiConstants.stories}/$storyId/related',
        queryParameters: {'limit': 6},
      );
      if (res.statusCode == 200 && res.data['success'] == true) {
        final list = res.data['data'] as List<dynamic>;
        return list.map((e) => Story.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<bool> toggleFavorite(String storyId) async {
    try {
      final res = await _api.dio.post('${ApiConstants.stories}/$storyId/favorite');
      if (res.statusCode == 200 && res.data['success'] == true) {
        return res.data['data']['favorited'] ?? false;
      }
    } catch (_) {}
    return false;
  }
}
