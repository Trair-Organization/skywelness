import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { GradientBackground } from '../components/premium/GradientBackground';
import { GlassCard } from '../components/premium/GlassCard';
import { showToast } from '../components/premium/Toast';
import { premium } from '../theme/premiumTheme';

const POLL_MS = 8000;

export function MemberPendingApprovalScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { refreshMe, logout, tenant, user } = useMemberAuth();
  const [checking, setChecking] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  // Pulse animation for the waiting indicator
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  // Auto-poll for approval
  const tick = useCallback(() => {
    refreshMe().catch(() => {});
  }, [refreshMe]);

  useEffect(() => {
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [tick]);

  // Handle rejection
  useEffect(() => {
    if (user?.accountStatus === 'rejected') {
      showToast(t('membership.rejectedBody'), 'error', 6000);
    }
  }, [user?.accountStatus, t]);

  const handleManualCheck = async () => {
    setChecking(true);
    const ok = await refreshMe();
    setChecking(false);
    if (ok && user?.accountStatus === 'active') {
      showToast(t('membership.approved'), 'success');
    } else {
      showToast(t('membership.stillPending'), 'info', 2500);
    }
  };

  const isRejected = user?.accountStatus === 'rejected';

  return (
    <GradientBackground>
      <View
        style={[styles.wrap, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}
      >
        <GlassCard style={styles.card}>
          {/* Animated waiting icon */}
          <Animated.View style={[styles.iconCircle, { opacity: pulseAnim }]}>
            <Text style={styles.iconEmoji}>{isRejected ? '😔' : '⏳'}</Text>
          </Animated.View>

          <Text style={styles.title}>
            {isRejected ? t('membership.rejectedTitle') : t('membership.pendingTitle')}
          </Text>

          <Text style={styles.body}>
            {isRejected ? t('membership.rejectedBody') : t('membership.pendingBody')}
          </Text>

          {/* Club info */}
          {tenant?.name && (
            <View style={styles.clubPill}>
              <Text style={styles.clubPillIcon}>🏢</Text>
              <View>
                <Text style={styles.clubPillName}>{tenant.name}</Text>
                <Text style={styles.clubPillCode}>{tenant.subdomain}</Text>
              </View>
            </View>
          )}

          {/* Estimated time */}
          {!isRejected && (
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>{t('membership.pendingEstimate')}</Text>
            </View>
          )}

          {/* What happens next */}
          {!isRejected && (
            <View style={styles.stepsBox}>
              <Text style={styles.stepsTitle}>{t('membership.whatHappens')}</Text>
              <View style={styles.stepItem}>
                <Text style={styles.stepBullet}>1</Text>
                <Text style={styles.stepText}>{t('membership.step1')}</Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={styles.stepBullet}>2</Text>
                <Text style={styles.stepText}>{t('membership.step2')}</Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={styles.stepBullet}>3</Text>
                <Text style={styles.stepText}>{t('membership.step3')}</Text>
              </View>
            </View>
          )}

          {/* Manual check button */}
          {!isRejected && (
            <Pressable
              style={({ pressed }) => [styles.checkBtn, pressed && styles.checkBtnPressed]}
              onPress={() => {
                handleManualCheck().catch(() => {});
              }}
              disabled={checking}
            >
              <Text style={styles.checkBtnTxt}>
                {checking ? t('membership.checking') : t('membership.checkNow')}
              </Text>
            </Pressable>
          )}

          {/* Contact club */}
          <View style={styles.contactBox}>
            <Text style={styles.contactText}>{t('membership.contactHint')}</Text>
          </View>

          {/* Logout */}
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
            onPress={() => {
              logout().catch(() => {});
            }}
          >
            <Text style={styles.logoutTxt}>{t('session.logout')}</Text>
          </Pressable>
        </GlassCard>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  card: { paddingVertical: 28, paddingHorizontal: 22, gap: 12, alignItems: 'center' },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 32 },
  title: { color: premium.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: {
    color: premium.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
  },
  clubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
  },
  clubPillIcon: { fontSize: 20 },
  clubPillName: { color: premium.text, fontSize: 14, fontWeight: '700' },
  clubPillCode: { color: premium.textMuted, fontSize: 12, marginTop: 1 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '100%',
  },
  infoIcon: { fontSize: 14, marginTop: 1 },
  infoText: { flex: 1, color: premium.textMuted, fontSize: 13, lineHeight: 18 },
  stepsBox: { width: '100%', gap: 8 },
  stepsTitle: { color: premium.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
    textAlign: 'center',
    lineHeight: 20,
    color: premium.accentBlue,
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: { flex: 1, color: premium.textMuted, fontSize: 13, lineHeight: 18 },
  checkBtn: {
    borderWidth: 1,
    borderColor: premium.accentBlue,
    borderRadius: premium.radiusSm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(56,189,248,0.08)',
    width: '100%',
    alignItems: 'center',
  },
  checkBtnPressed: { backgroundColor: 'rgba(56,189,248,0.2)' },
  checkBtnTxt: { color: premium.accentBlue, fontSize: 15, fontWeight: '700' },
  contactBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
  },
  contactText: { color: premium.textMuted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  logoutBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  logoutBtnPressed: { opacity: 0.7 },
  logoutTxt: { color: premium.textMuted, fontSize: 14, fontWeight: '600' },
});
