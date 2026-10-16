import type { CultivationRealmInfo } from '@/types';
export type RealmTier = 'vo-dao' | 'tu-tien' | 'tien-gioi';
export type Realm = CultivationRealmInfo & { tier: RealmTier; tierName: string };
// Used only in editorial copy; interactive catalogues use the API count.
export const REALM_COUNT = 34;
export const REALM_TIERS = [
  { key: 'vo-dao' as const, label: 'Võ Đạo' },
  { key: 'tu-tien' as const, label: 'Tu Tiên' },
  { key: 'tien-gioi' as const, label: 'Tiên Giới' },
];
export function adaptRealms(catalogue: CultivationRealmInfo[]): Realm[] {
  if (!catalogue.length || catalogue[0].min_exp !== 0) throw new Error('Danh sách cảnh giới chưa hợp lệ.');
  catalogue.forEach((realm, index) => {
    const last = index === catalogue.length - 1;
    if (realm.level !== index + 1 || !REALM_TIERS.some(tier => tier.key === realm.tier) || !Number.isSafeInteger(realm.min_exp) || (index > 0 && realm.min_exp !== catalogue[index - 1].max_exp) || (last ? realm.max_exp !== -1 : realm.max_exp <= realm.min_exp)) throw new Error('Danh sách cảnh giới chưa hợp lệ.');
  });
  return catalogue.map(realm => ({ ...realm, tier: realm.tier as RealmTier, tierName: realm.tier_name }));
}
export function getRealmProgress(exp = 0, realms: Realm[]) {
  const currentExp = Number.isFinite(exp) ? Math.max(0, exp) : 0;
  const realm = realms.find(item => item.max_exp === -1 || currentExp < item.max_exp);
  if (!realm) throw new Error('Chưa tải danh sách cảnh giới.');
  const progress = realm.max_exp === -1 ? 100 : Math.max(0, Math.min(100, (currentExp - realm.min_exp) / (realm.max_exp - realm.min_exp) * 100));
  return { realm, progress, currentExp, remaining: realm.max_exp === -1 ? 0 : realm.max_exp - currentExp };
}
