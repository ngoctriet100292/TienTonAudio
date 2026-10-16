'use client';

import { createContext, useContext } from 'react';
import { api } from '@/lib/api';
import { adaptRealms, REALM_TIERS, type Realm } from '@/lib/cultivation';
import { useAsyncResource } from '@/lib/use-async-resource';

const EMPTY_REALMS: Realm[] = [];
function useCatalogue() {
  const resource = useAsyncResource('cultivation-catalogue', async () => adaptRealms(await api.getCultivationRealms()), EMPTY_REALMS);
  return {
    realms: resource.data,
    count: resource.data.length,
    groups: REALM_TIERS.map(group => ({ ...group, count: resource.data.filter(realm => realm.tier === group.key).length })),
    loading: resource.loading,
    error: resource.error,
    reload: resource.reload,
  };
}
const CultivationContext = createContext<ReturnType<typeof useCatalogue> | null>(null);
export function CultivationProvider({ children }: { children: React.ReactNode }) {
  const catalogue = useCatalogue();
  return <CultivationContext.Provider value={catalogue}>{children}</CultivationContext.Provider>;
}
export function useCultivationCatalogue() {
  const catalogue = useContext(CultivationContext);
  if (!catalogue) throw new Error('Missing CultivationProvider');
  return catalogue;
}
