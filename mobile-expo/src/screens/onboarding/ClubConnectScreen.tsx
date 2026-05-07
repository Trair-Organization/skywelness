import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
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
const owellnessLogo = require('../../../assets/branding/clubs/owellness.png');
const skylandLogo = require('../../../assets/branding/clubs/skyland.png');

type FeaturedClub = {
  id: string;
  name: string;
  subdomain: string;
  location: string;
  logo: ImageSourcePropType;
  featured?: boolean;
};

const FEATURED_CLUBS: FeaturedClub[] = [
  {
    id: 'o-wellness-sky',
    name: "O'Wellness Sky",
    subdomain: 'o-wellness-sky',
    location: 'İstanbul · Skyland',
    logo: owellnessLogo,
    featured: true,
  },
  {
    id: 'o-wellness-dragos',
    name: "O'Wellness Dragos",
    subdomain: 'o-wellness-dragos',
    location: 'İstanbul · Dragos',
    logo: owellnessLogo,
  },
  {
    id: 'o-wellness-yalikavak',
    name: "O'Wellness Yalıkavak",
    subdomain: 'o-wellness-yalikavak',
    location: 'Bodrum · Yalıkavak',
    logo: owellnessLogo,
  },
  {
    id: 'skyland-wellness',
    name: 'Skyland Wellness',
    subdomain: 'skyland-wellness',
    location: 'İstanbul · Skyland',
    logo: skylandLogo,
  },
];

type Nav = NativeStackNavigationProp<RootStackParamList, 'ClubConnect'>;

const SLIDER_CARD_WIDTH = 168;
const SLIDER_CARD_GAP = 12;
const SLIDER_STEP = SLIDER_CARD_WIDTH + SLIDER_CARD_GAP;
const SLIDER_TRACK_WIDTH = SLIDER_STEP * FEATURED_CLUBS.length;
const SLIDER_DURATION_MS = 6000 * FEATURED_CLUBS.length;

export function ClubConnectScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { tenantDirectory, loadTenantDirectory } = useMemberAuth();
  const [previewClub, setPreviewClub] = useState<TenantListRow | null>(null);
  const activeClubCount = String(Math.max(tenantDirectory.length, FEATURED_CLUBS.length));
  const sliderX = useRef(new Animated.Value(0)).current;
  const runSafe = (fn?: () => Promise<unknown> | unknown) => {
    if (typeof fn !== 'function') {
      return;
    }
    Promise.resolve(fn()).catch(() => {});
  };

  useEffect(() => {
    Promise.resolve(loadTenantDirectory()).catch(() => {});
  }, [loadTenantDirectory]);

  useEffect(() => {
    sliderX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(sliderX, {
        toValue: -SLIDER_TRACK_WIDTH,
        duration: SLIDER_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [sliderX]);

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

        <View style={styles.sliderViewport} pointerEvents="box-none">
          <Animated.View style={[styles.sliderTrack, { transform: [{ translateX: sliderX }] }]}>
            {[...FEATURED_CLUBS, ...FEATURED_CLUBS].map((club, idx) => {
              const directoryMatch = tenantDirectory.find(
                (row) => row.subdomain === club.subdomain,
              );
              const handlePress = () => {
                setPreviewClub(
                  directoryMatch ?? {
                    id: club.id,
                    name: club.name,
                    subdomain: club.subdomain,
                    logoUrl: null,
                  },
                );
              };
              return (
                <Pressable
                  key={`${club.id}-${idx}`}
                  onPress={handlePress}
                  style={({ pressed }) => [
                    styles.clubCard,
                    club.featured && styles.clubCardFeatured,
                    pressed && styles.clubCardPressed,
                  ]}
                >
                  {club.featured ? (
                    <View style={styles.featuredRibbon}>
                      <Text style={styles.featuredRibbonTxt}>
                        {t('onboarding.clubCardFeaturedBadge')}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.clubLogoWrap}>
                    <Image source={club.logo} style={styles.clubLogoImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.clubName} numberOfLines={2}>
                    {club.name}
                  </Text>
                  <Text style={styles.clubLocation} numberOfLines={1}>
                    {club.location}
                  </Text>
                  <View style={styles.clubCtaRow}>
                    <Text style={styles.clubCtaTxt}>{t('onboarding.clubCardCta')}</Text>
                    <Text style={styles.clubCtaArrow}>›</Text>
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
          <View pointerEvents="none" style={[styles.sliderFade, styles.sliderFadeLeft]} />
          <View pointerEvents="none" style={[styles.sliderFade, styles.sliderFadeRight]} />
        </View>

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
  popularHeader: {
    marginTop: 2,
    marginBottom: 12,
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
  sliderViewport: {
    marginHorizontal: -22,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sliderTrack: {
    flexDirection: 'row',
    gap: SLIDER_CARD_GAP,
    paddingHorizontal: 22,
    paddingVertical: 6,
  },
  sliderFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 28,
  },
  sliderFadeLeft: {
    left: 0,
    backgroundColor: 'rgba(2,8,18,0.55)',
  },
  sliderFadeRight: {
    right: 0,
    backgroundColor: 'rgba(2,8,18,0.55)',
  },
  clubCard: {
    width: SLIDER_CARD_WIDTH,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(8,16,28,0.7)',
    padding: 14,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  clubCardFeatured: {
    borderColor: 'rgba(56,189,248,0.55)',
    backgroundColor: 'rgba(14,28,46,0.85)',
  },
  clubCardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  featuredRibbon: {
    position: 'absolute',
    top: 8,
    right: -22,
    transform: [{ rotate: '32deg' }],
    paddingHorizontal: 24,
    paddingVertical: 2,
    backgroundColor: 'rgba(56,189,248,0.85)',
  },
  featuredRibbonTxt: {
    color: '#02121f',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  clubLogoWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    padding: 10,
  },
  clubLogoImage: {
    width: '100%',
    height: '100%',
  },
  clubName: {
    color: premium.text,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    minHeight: 36,
  },
  clubLocation: {
    color: premium.textMuted,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  clubCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premium.glassBorder,
    width: '100%',
    justifyContent: 'center',
  },
  clubCtaTxt: {
    color: premium.accentBlue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  clubCtaArrow: {
    color: premium.accentBlue,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: -2,
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
