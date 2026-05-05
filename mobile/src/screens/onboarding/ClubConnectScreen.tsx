import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';
import { persistLanguage } from '../../i18n';

const logoLight = require('../../../assets/branding/wellness-club-logo-header.png');

type Nav = NativeStackNavigationProp<RootStackParamList, 'ClubConnect'>;

export function ClubConnectScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { tenantDirectory, loadTenantDirectory } = useMemberAuth();
  const activeClubCount = String(tenantDirectory.length);
  const runSafe = (fn?: () => Promise<unknown> | unknown) => {
    if (typeof fn !== 'function') {
      return;
    }
    Promise.resolve(fn()).catch(() => {});
  };

  useEffect(() => {
    Promise.resolve(loadTenantDirectory()).catch(() => {});
  }, [loadTenantDirectory]);

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('lang.label')}
            style={styles.langIconBtn}
            onPress={() => {
              const next = i18n.language === 'tr' ? 'en' : 'tr';
              runSafe(() => persistLanguage(next));
            }}
          >
            <Text style={styles.langIcon}>🌐</Text>
            <Text style={styles.langIconText}>{i18n.language === 'tr' ? 'TR' : 'EN'}</Text>
          </Pressable>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={t('appTitle')}
            source={logoLight}
            style={styles.logo}
          />
          <Text style={styles.headline}>{t('onboarding.clubHeadline')}</Text>
          <Text style={styles.slogan}>{t('onboarding.ecosystemSlogan')}</Text>
          <Text style={styles.valueProp}>{t('onboarding.valueProposition')}</Text>
          <Text style={styles.sub}>{t('onboarding.clubSubtitle')}</Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{activeClubCount}</Text>
            <Text style={styles.metricLabel}>{t('onboarding.metricClubs')}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>24/7</Text>
            <Text style={styles.metricLabel}>{t('onboarding.metricAvailability')}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>Premium</Text>
            <Text style={styles.metricLabel}>{t('onboarding.metricExperience')}</Text>
          </View>
        </View>

        <GlassCard style={styles.popularCard}>
          <Text style={styles.popularTitle}>Popüler Kulüpler</Text>
          <Text style={styles.popularSubtitle}>{t('onboarding.clubShowcaseSubtitle')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularSlider}
          >
            {tenantDirectory.map((club, index) => {
              const featured = index === 0;
              const initials = club.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? '')
                .join('');
              return (
                <View
                  key={club.id}
                  style={[styles.popularClubCard, featured && styles.popularClubCardFeatured]}
                >
                  <View style={styles.popularTop}>
                    <Text style={styles.popularBadge}>
                      {featured
                        ? t('onboarding.clubCardFeaturedBadge')
                        : t('onboarding.clubCardBadge')}
                    </Text>
                    <View style={styles.popularLogoBubble}>
                      {club.logoUrl ? (
                        <Image source={{ uri: club.logoUrl }} style={styles.popularLogoImage} />
                      ) : (
                        <Text style={styles.popularLogoTxt}>{initials || 'WC'}</Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.popularClubName}>{club.name}</Text>
                  <Text style={styles.popularClubCode}>@{club.subdomain}</Text>
                </View>
              );
            })}
          </ScrollView>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.cardHint}>{t('registration.typeSubtitle')}</Text>

          <Pressable
            style={({ pressed }) => [styles.outlineBtn, pressed && styles.outlinePressed]}
            onPress={() => {
              navigation.navigate('RegistrationType');
            }}
          >
            <Text style={styles.outlineTxt}>{t('onboarding.signUp')}</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.secondaryTxt}>{t('onboarding.signIn')}</Text>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 22,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
  },
  top: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  langIconBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langIcon: {
    fontSize: 14,
  },
  langIconText: {
    color: premium.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 20,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: premium.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  slogan: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '800',
    color: premium.accentBlue,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  valueProp: {
    marginTop: 10,
    fontSize: 14,
    color: premium.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  sub: {
    marginTop: 10,
    fontSize: 16,
    color: premium.textMuted,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  metricValue: {
    color: premium.text,
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    marginTop: 4,
    color: premium.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  popularCard: {
    marginTop: 2,
    marginBottom: 12,
  },
  popularTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 4,
  },
  popularSubtitle: {
    fontSize: 13,
    color: premium.textMuted,
    marginBottom: 10,
  },
  popularSlider: {
    gap: 10,
    paddingRight: 8,
  },
  popularClubCard: {
    width: 220,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.24)',
    padding: 12,
  },
  popularClubCardFeatured: {
    borderColor: 'rgba(56,189,248,0.45)',
    backgroundColor: 'rgba(8,47,73,0.4)',
  },
  popularTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popularBadge: {
    color: premium.accentBlue,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  popularLogoBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  popularLogoImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  popularLogoTxt: {
    color: premium.text,
    fontWeight: '800',
    fontSize: 12,
  },
  popularClubName: {
    color: premium.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
  },
  popularClubCode: {
    color: premium.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  card: {
    marginTop: 4,
    paddingBottom: 26,
  },
  cardHint: {
    fontSize: 13,
    lineHeight: 19,
    color: premium.textMuted,
    marginBottom: 14,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 58,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  outlinePressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  outlineTxt: {
    color: premium.accentGreen,
    fontWeight: '700',
    fontSize: 17,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginTop: 2,
  },
  secondaryTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});
