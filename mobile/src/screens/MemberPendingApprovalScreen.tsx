import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { GradientBackground } from '../components/premium/GradientBackground';
import { GlassCard } from '../components/premium/GlassCard';
import { premium } from '../theme/premiumTheme';

const POLL_MS = 8000;

export function MemberPendingApprovalScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { refreshMe, logout, tenant, user } = useMemberAuth();
  const rejectedAlertShown = useRef(false);
  const tick = useCallback(() => {
    refreshMe().catch(() => {});
  }, [refreshMe]);

  useEffect(() => {
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      clearInterval(id);
    };
  }, [tick]);

  useEffect(() => {
    if (
      user?.role === 'member' &&
      user.accountStatus === 'rejected' &&
      !rejectedAlertShown.current
    ) {
      rejectedAlertShown.current = true;
      Alert.alert(t('membership.rejectedTitle'), t('membership.rejectedBody'), [
        {
          text: t('session.logout'),
          onPress: () => {
            logout().catch(() => {});
          },
        },
      ]);
    }
  }, [user?.role, user?.accountStatus, t, logout]);

  return (
    <GradientBackground>
      <View
        style={[styles.wrap, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}
      >
        <GlassCard style={styles.card}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
          <Text style={styles.title}>{t('membership.pendingTitle')}</Text>
          <Text style={styles.body}>{t('membership.pendingBody')}</Text>
          {tenant?.name ? (
            <Text style={styles.club}>
              {tenant.name} · {tenant.subdomain}
            </Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.outlineBtn, pressed && styles.outlineBtnPressed]}
            onPress={logout}
          >
            <Text style={styles.outlineTxt}>{t('session.logout')}</Text>
          </Pressable>
        </GlassCard>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    paddingVertical: 28,
    paddingHorizontal: 22,
    gap: 14,
    alignItems: 'center',
  },
  title: {
    marginTop: 6,
    color: premium.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: premium.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  club: {
    color: premium.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  outlineBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  outlineBtnPressed: {
    opacity: 0.85,
  },
  outlineTxt: {
    color: premium.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
