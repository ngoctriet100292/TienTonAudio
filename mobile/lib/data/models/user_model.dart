class User {
  final String id;
  final String username;
  final String email;
  final String? avatarUrl;
  final String role;
  final bool isEmailVerified;
  final bool twoFactorEnabled;

  User({
    required this.id,
    required this.username,
    required this.email,
    this.avatarUrl,
    required this.role,
    required this.isEmailVerified,
    required this.twoFactorEnabled,
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
    );
  }
}
