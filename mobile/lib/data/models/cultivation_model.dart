class CultivationRealmInfo {
  final int level;
  final String name;
  final int minExp;
  final int maxExp;
  final String description;
  final String color;

  CultivationRealmInfo({
    required this.level,
    required this.name,
    required this.minExp,
    required this.maxExp,
    required this.description,
    required this.color,
  });

  factory CultivationRealmInfo.fromJson(Map<String, dynamic> json) {
    return CultivationRealmInfo(
      level: json['level'] ?? 1,
      name: json['name'] ?? '',
      minExp: json['min_exp'] ?? 0,
      maxExp: json['max_exp'] ?? -1,
      description: json['description'] ?? '',
      color: json['color'] ?? '#FFB703',
    );
  }
}

class UserCultivation {
  final String currentRealm;
  final int level;
  final int currentExp;
  final int nextRealmExp;
  final double progressPct;
  final double expMultiplier;
  final String vipStatus;
  final String color;
  final String description;
  final List<CultivationRealmInfo> allRealms;

  UserCultivation({
    required this.currentRealm,
    required this.level,
    required this.currentExp,
    required this.nextRealmExp,
    required this.progressPct,
    required this.expMultiplier,
    required this.vipStatus,
    required this.color,
    required this.description,
    required this.allRealms,
  });

  factory UserCultivation.fromJson(Map<String, dynamic> json) {
    final realmsList = (json['all_realms'] as List<dynamic>?)
            ?.map((e) => CultivationRealmInfo.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    return UserCultivation(
      currentRealm: json['current_realm'] ?? 'Luyện Khí',
      level: json['level'] ?? 1,
      currentExp: json['current_exp'] ?? 0,
      nextRealmExp: json['next_realm_exp'] ?? 60,
      progressPct: (json['progress_pct'] ?? 0.0).toDouble(),
      expMultiplier: (json['exp_multiplier'] ?? 1.0).toDouble(),
      vipStatus: json['vip_status'] ?? 'none',
      color: json['color'] ?? '#94A3B8',
      description: json['description'] ?? '',
      allRealms: realmsList,
    );
  }
}
