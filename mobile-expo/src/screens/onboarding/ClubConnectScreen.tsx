import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import type { TenantListRow } from '../../auth/memberAuthTypes';
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
  const [previewClub, setPreviewClub] = useState<TenantListRow | null>(null);
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

        <View style={styles.popularHeader}>
          <Text style={styles.popularTitle}>Popüler Kulüpler</Text>
          <Text style={styles.popularSubtitle}>{t('onboarding.clubShowcaseSubtitle')}</Text>
        </View>

        <GlassCard style={styles.popularCard}>
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
                <Pressable
                  key={club.id}
                  style={[styles.popularClubCard, featured && styles.popularClubCardFeatured]}
                  onPress={() => setPreviewClub(club)}
                >
                  <View
                    style={[styles.popularLogoBubble, featured && styles.popularLogoBubbleFeatured]}
                  >
                    {club.logoUrl ? (
                      <Image source={{ uri: club.logoUrl }} style={styles.popularLogoImage} />
                    ) : (
                      <Text style={styles.popularLogoTxt}>{initials || 'WC'}</Text>
                    )}
                  </View>
                  <Text style={styles.popularBadge}>
                    {featured
                      ? t('onboarding.clubCardFeaturedBadge')
                      : t('onboarding.clubCardBadge')}
                  </Text>
                  <Text style={styles.popularClubName} numberOfLines={2}>
                    {club.name}
                  </Text>
                  <Text style={styles.popularClubCode}>@{club.subdomain}</Text>
                </Pressable>
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
      <Modal
        visible={!!previewClub}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPreviewClub(null)}
      >
        <View
          style={[
            styles.modalBackdrop,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
          ]}
        >
          <Pressable style={styles.modalDismissArea} onPress={() => setPreviewClub(null)} />
          <View style={styles.modalSheet}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalCard}>
                <View style={styles.modalAvatar}>
                  {previewClub?.logoUrl ? (
                    <Image source={{ uri: previewClub.logoUrl }} style={styles.modalAvatarImage} />
                  ) : (
                    <Text style={styles.modalAvatarTxt}>
                      {(previewClub?.name ?? 'Wellness Club')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() ?? '')
                        .join('') || 'WC'}
                    </Text>
                  )}
                </View>
                <Text style={styles.modalTitle}>{previewClub?.name}</Text>
                <Text style={styles.modalCode}>@{previewClub?.subdomain}</Text>
                <Text style={styles.modalBody}>
                  Bu kulup ile kaydolursan hesabin bu kulube bagli olusturulur. Istersen daha sonra
                  kulupsuz da devam edebilirsin.
                </Text>
                <Pressable
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    const subdomain = previewClub?.subdomain;
                    setPreviewClub(null);
                    navigation.navigate('Register', {
                      preselectedSubdomain: subdomain,
                    });
                  }}
                >
                  <Text style={styles.modalPrimaryTxt}>Kulube Katil</Text>
                </Pressable>
                <Pressable style={styles.modalSecondaryBtn} onPress={() => setPreviewClub(null)}>
                  <Text style={styles.modalSecondaryTxt}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginTop: 0,
    marginBottom: 12,
    paddingVertical: 14,
  },
  popularHeader: {
    marginTop: 2,
    marginBottom: 8,
  },
  popularTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 5,
  },
  popularSubtitle: {
    fontSize: 14,
    color: premium.textMuted,
  },
  popularSlider: {
    gap: 12,
    paddingRight: 12,
    alignItems: 'flex-start',
  },
  popularClubCard: {
    width: 116,
    alignItems: 'center',
    paddingVertical: 4,
  },
  popularClubCardFeatured: {
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    color: premium.accentBlue,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
  },
  popularLogoBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: premium.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  popularLogoBubbleFeatured: {
    borderColor: 'rgba(56,189,248,0.55)',
  },
  popularLogoImage: {
    width: '100%',
    height: '100%',
  },
  popularLogoTxt: {
    color: premium.text,
    fontWeight: '800',
    fontSize: 24,
  },
  popularClubName: {
    color: premium.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
    minHeight: 34,
  },
  popularClubCode: {
    color: premium.textMuted,
    fontSize: 11,
    marginTop: 2,
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
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,8,18,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 32,
  },
  modalDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 370,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(6,18,33,0.98)',
    maxHeight: '72%',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  modalScroll: {
    width: '100%',
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalCard: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  modalAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
  },
  modalAvatarTxt: {
    color: premium.text,
    fontSize: 26,
    fontWeight: '800',
  },
  modalTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: premium.text,
    textAlign: 'center',
  },
  modalCode: {
    marginTop: 4,
    fontSize: 13,
    color: premium.textMuted,
  },
  modalBody: {
    marginTop: 12,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 20,
    color: premium.textMuted,
    textAlign: 'center',
  },
  modalPrimaryBtn: {
    width: '100%',
    minHeight: 50,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 8,
  },
  modalPrimaryTxt: {
    color: premium.accentGreen,
    fontSize: 16,
    fontWeight: '800',
  },
  modalSecondaryBtn: {
    width: '100%',
    minHeight: 44,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  modalSecondaryTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});
