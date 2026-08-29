import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/chapter_model.dart';
import '../models/story_model.dart';

class AudioPlayerService extends ChangeNotifier {
  static final AudioPlayerService _instance = AudioPlayerService._internal();
  factory AudioPlayerService() => _instance;

  final AudioPlayer _player = AudioPlayer();
  final ApiClient _api = ApiClient();

  AudioPlayer get player => _player;

  Story? _currentStory;
  Chapter? _currentChapter;
  bool _isLoading = false;
  String? _errorMessage;
  Timer? _sleepTimer;
  Duration? _sleepDurationLeft;

  Story? get currentStory => _currentStory;
  Chapter? get currentChapter => _currentChapter;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get hasActiveTrack => _currentChapter != null;
  Duration? get sleepDurationLeft => _sleepDurationLeft;

  AudioPlayerService._internal() {
    _initListeners();
  }

  void _initListeners() {
    _player.playbackEventStream.listen((event) {}, onError: (Object e, StackTrace st) {
      _errorMessage = 'Lỗi phát audio: $e';
      notifyListeners();
    });

    _player.playerStateStream.listen((state) {
      if (state.processingState == ProcessingState.completed) {
        _onTrackCompleted();
      }
      notifyListeners();
    });
  }

  Future<void> loadAndPlay({
    required Story story,
    required Chapter chapter,
    String quality = '128k',
  }) async {
    _currentStory = story;
    _currentChapter = chapter;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // 1. Lấy Signed Stream URL từ Backend Go
      final res = await _api.dio.get(
        '${ApiConstants.chapters}/${chapter.id}/stream',
        queryParameters: {'quality': quality},
      );

      if (res.statusCode == 200 && res.data['success'] == true) {
        final streamResult = StreamUrlResult.fromJson(res.data['data']);
        
        // 2. Nạp link audio vào JustAudio
        await _player.setUrl(streamResult.streamUrl);
        await _player.play();
      } else {
        _errorMessage = res.data['message'] ?? 'Không thể tải audio tập này';
      }
    } catch (e) {
      _errorMessage = 'Lỗi kết nối tới máy chủ audio: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> play() async => await _player.play();
  Future<void> pause() async {
    await _player.pause();
    _saveProgress();
  }

  Future<void> seek(Duration position) async => await _player.seek(position);

  Future<void> seekRelative(int seconds) async {
    final current = _player.position;
    final target = current + Duration(seconds: seconds);
    if (target < Duration.zero) {
      await _player.seek(Duration.zero);
    } else {
      await _player.seek(target);
    }
  }

  Future<void> setSpeed(double speed) async {
    await _player.setSpeed(speed);
    notifyListeners();
  }

  void setSleepTimer(Duration duration) {
    _sleepTimer?.cancel();
    _sleepDurationLeft = duration;
    notifyListeners();

    _sleepTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_sleepDurationLeft != null && _sleepDurationLeft!.inSeconds > 0) {
        _sleepDurationLeft = _sleepDurationLeft! - const Duration(seconds: 1);
        notifyListeners();
      } else {
        pause();
        cancelSleepTimer();
      }
    });
  }

  void cancelSleepTimer() {
    _sleepTimer?.cancel();
    _sleepTimer = null;
    _sleepDurationLeft = null;
    notifyListeners();
  }

  Future<void> _saveProgress() async {
    if (_currentChapter == null || _currentStory == null) return;
    try {
      await _api.dio.post(
        '${ApiConstants.chapters}/progress',
        data: {
          'chapter_id': _currentChapter!.id,
          'story_id': _currentStory!.id,
          'last_position_seconds': _player.position.inSeconds,
          'is_completed': false,
        },
      );
    } catch (_) {}
  }

  void _onTrackCompleted() {
    _saveProgress();
  }

  @override
  void dispose() {
    _player.dispose();
    _sleepTimer?.cancel();
    super.dispose();
  }
}
