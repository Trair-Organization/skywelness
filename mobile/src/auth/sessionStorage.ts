import AsyncStorage from '@react-native-async-storage/async-storage';

const K = {
  access: 'wellness_club_access_token',
  refresh: 'wellness_club_refresh_token',
  tenantSub: 'wellness_club_tenant_subdomain',
  tenantJson: 'wellness_club_tenant_json',
  userJson: 'wellness_club_user_json',
} as const;

export type StoredMemberSession = {
  accessToken: string;
  refreshToken: string;
  tenantSubdomain: string;
  tenantJson: string | null;
  userJson: string | null;
};

export async function saveMemberSession(input: {
  accessToken: string;
  refreshToken: string;
  tenantSubdomain: string;
  tenant: { id: string; name: string; subdomain: string };
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
}): Promise<void> {
  await AsyncStorage.multiSet([
    [K.access, input.accessToken],
    [K.refresh, input.refreshToken],
    [K.tenantSub, input.tenantSubdomain.trim().toLowerCase()],
    [K.tenantJson, JSON.stringify(input.tenant)],
    [K.userJson, JSON.stringify(input.user)],
  ]);
}

export async function loadMemberSession(): Promise<StoredMemberSession | null> {
  const [[, access], [, refresh], [, tenantSub], [, tenantJson], [, userJson]] =
    await AsyncStorage.multiGet([K.access, K.refresh, K.tenantSub, K.tenantJson, K.userJson]);
  if (!refresh || !tenantSub) {
    return null;
  }
  return {
    accessToken: access ?? '',
    refreshToken: refresh,
    tenantSubdomain: tenantSub,
    tenantJson: tenantJson || null,
    userJson: userJson || null,
  };
}

export async function clearMemberSession(): Promise<void> {
  await AsyncStorage.multiRemove([K.access, K.refresh, K.tenantSub, K.tenantJson, K.userJson]);
}
