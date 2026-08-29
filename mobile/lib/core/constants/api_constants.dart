class ApiConstants {
  // Thay đổi IP này khi chạy trên thiết bị thật (VD: http://192.168.1.X:8080/api/v1)
  // Mặc định: 10.0.2.2 cho Android Emulator, localhost cho iOS Simulator
  static const String baseUrl = 'http://10.0.2.2:8080/api/v1';

  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String verify2FA = '/auth/2fa/verify';
  static const String enable2FA = '/auth/2fa/enable';
  static const String disable2FA = '/auth/2fa/disable';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String forgotPassword = '/auth/forgot-password';

  // User
  static const String me = '/users/me';
  static const String listeningHistory = '/users/history';
  static const String favorites = '/users/favorites';
  static const String followingAuthors = '/users/following-authors';
  static const String followingNarrators = '/users/following-narrators';

  // Stories
  static const String stories = '/stories';
  static const String topViews = '/stories/top-views';
  static const String searchStories = '/stories/search';
  static const String categories = '/stories/categories';

  // Chapters & Streaming
  static const String chapters = '/chapters';

  // Comments
  static const String comments = '/comments';

  // Playlists
  static const String playlists = '/playlists';

  // Notifications
  static const String notifications = '/notifications';
  static const String unreadCount = '/notifications/unread-count';

  // Reports
  static const String reports = '/reports';
}
