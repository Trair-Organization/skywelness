import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { persistLanguage } from '../../i18n';
import { premium } from '../../theme/premiumTheme';

const TAB_BAR_PAD = 72;

export function MemberProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, tenant, logout } = useMemberAuth();

  if (!user || !tenant) {
    return null;
  }

  const openPolicies = () => {
    Alert.alert(t('home.policiesCta'), t('home.policiesBody'));
  };

  const openContact = () => {
    Alert.alert(t('home.contactClub'), t('home.contactClubAlert'));
  };

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + TAB_BAR_PAD },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>{t('tabs.profile')}</Text>
        <Text style={styles.screenSub}>{t('profile.subtitle')}</Text>

        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('session.title')}</Text>
          <Text style={styles.cardLineMuted}>{t('home.sessionHint')}</Text>
          <Text style={styles.cardLine}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.cardLine}>{user.email}</Text>
          <Text style={styles.cardLine}>{t('session.role', { role: user.role })}</Text>
          <Text style={styles.cardLineMuted}>
            {tenant.name} · {tenant.subdomain}
          </Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('lang.label')}</Text>
          <View style={styles.langSeg}>
            <Pressable
              accessibilityRole="button"
              style={[styles.langBtn, i18n.language === 'tr' && styles.langBtnOn]}
              onPress={() => {
                persistLanguage('tr').catch(() => {});
              }}
            >
              <Text style={[styles.langTxt, i18n.language === 'tr' && styles.langTxtOn]}>
                {t('lang.tr')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.langBtn, i18n.language === 'en' && styles.langBtnOn]}
              onPress={() => {
                persistLanguage('en').catch(() => {});
              }}
            >
              <Text style={[styles.langTxt, i18n.language === 'en' && styles.langTxtOn]}>
                {t('lang.en')}
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('home.helpTitle')}</Text>
          <Text style={styles.muted}>{t('home.helpBody')}</Text>
          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
            onPress={openPolicies}
          >
            <Text style={styles.btnOutlineTxt}>{t('home.policiesCta')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
            onPress={openContact}
          >
            <Text style={styles.btnOutlineTxt}>{t('home.contactClub')}</Text>
          </Pressable>
        </GlassCard>

        <Pressable
          style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
          onPress={() => {
            logout().catch(() => {});
          }}
        >
          <Text style={styles.btnGhostTxt}>{t('session.logout')}</Text>
        </Pressable>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    flexGrow: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 14,
    color: premium.textMuted,
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
  },
  cardLine: {
    fontSize: 15,
    color: premium.text,
    marginBottom: 4,
  },
  cardLineMuted: {
    fontSize: 13,
    color: premium.textMuted,
    marginBottom: 10,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    color: premium.textMuted,
    marginBottom: 12,
  },
  langSeg: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  langBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  langBtnOn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  langTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: premium.textMuted,
  },
  langTxtOn: {
    color: premium.text,
  },
  btnOutline: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  btnOutlinePressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnOutlineTxt: {
    color: premium.accentBlue,
    fontWeight: '700',
    fontSize: 15,
  },
  btnGhost: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: 8,
  },
  btnGhostPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnGhostTxt: {
    color: premium.textMuted,
    fontWeight: '700',
    fontSize: 15,
  },
});
