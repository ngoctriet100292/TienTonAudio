class User {
  final String id;
  final String username;
  final String email;
  final String? avatarUrl;
  final String role;
  final bool isEmailVerified;
  final bool twoFactorEnabled;
  final String cultivationRealm;
  final int cultivationExp;
  final int cultivationLevel;
  final String cultivationColor;

  User({
    required this.id,
    required this.username,
    required this.email,
    this.avatarUrl,
    required this.role,
    required this.isEmailVerified,
    required this.twoFactorEnabled,
    this.cultivationRealm = 'Luyện Khí',
    this.cultivationExp = 0,
    this.cultivationLevel = 1,
    this.cultivationColor = '#94A3B8',
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      avatarUrl: json['avatar_url'],
      role: json['role'] ?? 'user',
      isEmailVerified: json['is_email_verified'] ?? false,
      twoFactorEnabled: json['two_factor_enabled'] ?? false,
      cultivationRealm: json['cultivation_realm'] ?? 'Luyện Khí',
      cultivationExp: json['cultivation_exp'] ?? 0,
      cultivationLevel: json['cultivation_level'] ?? 1,
      cultivationColor: json['cultivation_color'] ?? '#94A3B8',
    );
  }
}
