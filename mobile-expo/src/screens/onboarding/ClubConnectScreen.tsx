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
const SLIDER_DURATION_MS = 9500 * FEATURED_CLUBS.length;

type RotatingHeadline = {
  title: string;
  personas: string[];
};

const ROTATING_HEADLINES: RotatingHeadline[] = [
  {
    title: 'Yakınındaki en iyi spor kulübü\nparmaklarının ucunda.',
    personas: ['Yeni başlayan', 'Spor salonu arayan'],
  },
  {
    title: 'Hedefin zayıflamak mı?\nSana özel eğitmen ve plan.',
    personas: ['Kilo veren', 'Form tutmak isteyen'],
  },
  {
    title: 'Bu hafta semtinde 12 etkinlik var.\nYeri kapmak ister misin?',
    personas: ['Etkinlik avcısı', 'Sosyal sporcu'],
  },
  {
    title: 'Sertifikalı eğitmenler bir tık uzakta.\nSeninle çalışmaya hazırlar.',
    personas: ['Eğitmen arayan', 'Performans odaklı'],
  },
];

const HEADLINE_ROTATE_MS = 4500;

type Goal = {
  id: 'fat-loss' | 'strength' | 'yoga' | 'performance';
  icon: string;
  label: string;
  hint: string;
};

const GOALS: Goal[] = [
  { id: 'fat-loss', icon: '🔥', label: 'Form & Kilo', hint: 'Yağ yak, fit kal' },
  { id: 'strength', icon: '💪', label: 'Kuvvet', hint: 'Kas & güç' },
  { id: 'yoga', icon: '🧘', label: 'Yoga & Pilates', hint: 'Esneklik & nefes' },
  { id: 'performance', icon: '🏃', label: 'Performans', hint: 'Sporcu seviyesi' },
];

type SocialStat = {
  value: string;
  label: string;
};

const SOCIAL_STATS: SocialStat[] = [
  { value: '12.500+', label: 'Aktif üye' },
  { value: '350+', label: 'Doğrulanmış eğitmen' },
  { value: '4.8 ★', label: 'App Store puanı' },
];

type Testimonial = {
  quote: string;
  author: string;
  meta: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote: '3 ayda 9 kilo verdim. Eğitmenim sayesinde antrenmana gitmek artık keyif.',
    author: 'Ayşe K.',
    meta: "O'Wellness Sky · 6 aylık üye",
  },
  {
    quote: 'Rezervasyonu telefondan 10 saniyede yapıyorum. Sıra beklemek tarih oldu.',
    author: 'Mert D.',
    meta: 'Skyland Wellness · 1 yıllık üye',
  },
  {
    quote: 'Kulüp değiştirdiğimde tüm geçmişim, paketlerim taşındı. Tek uygulama yetiyor.',
    author: 'Selin Y.',
    meta: "O'Wellness Yalıkavak · 4 aylık üye",
  },
];

const TESTIMONIAL_ROTATE_MS = 6000;

export function ClubConnectScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { tenantDirectory, loadTenantDirectory } = useMemberAuth();
  const [previewClub, setPreviewClub] = useState<TenantListRow | null>(null);
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<Goal['id'] | null>(null);
  const sliderX = useRef(new Animated.Value(0)).current;
  const headlineOpacity = useRef(new Animated.Value(1)).current;
  const testimonialOpacity = useRef(new Animated.Value(1)).current;
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

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(headlineOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(headlineOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => {
        setHeadlineIdx((prev) => (prev + 1) % ROTATING_HEADLINES.length);
      }, 350);
    }, HEADLINE_ROTATE_MS);
    return () => clearInterval(interval);
  }, [headlineOpacity]);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(testimonialOpacity, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(testimonialOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => {
        setTestimonialIdx((prev) => (prev + 1) % TESTIMONIALS.length);
      }, 320);
    }, TESTIMONIAL_ROTATE_MS);
    return () => clearInterval(interval);
  }, [testimonialOpacity]);

  const headline = ROTATING_HEADLINES[headlineIdx];
  const testimonial = TESTIMONIALS[testimonialIdx];

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
          <Animated.View style={[styles.headlineWrap, { opacity: headlineOpacity }]}>
            <Text style={styles.headline}>{headline.title}</Text>
            <View style={styles.personasRow}>
              {headline.personas.map((p) => (
                <View key={p} style={styles.personaChip}>
                  <Text style={styles.personaChipTxt}>{p}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
          <Text style={styles.slogan}>{t('onboarding.ecosystemSlogan')}</Text>
        </View>

        <View style={styles.statsRow}>
          {SOCIAL_STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.goalsBlock}>
          <Text style={styles.goalsTitle}>Hedefin ne?</Text>
          <Text style={styles.goalsSubtitle}>
            Sana en uygun kulüp ve eğitmenleri öne çıkaralım.
          </Text>
          <View style={styles.goalsGrid}>
            {GOALS.map((goal) => {
              const active = selectedGoal === goal.id;
              return (
                <Pressable
                  key={goal.id}
                  onPress={() => setSelectedGoal(active ? null : goal.id)}
                  style={({ pressed }) => [
                    styles.goalChip,
                    active && styles.goalChipActive,
                    pressed && styles.goalChipPressed,
                  ]}
                >
                  <Text style={styles.goalIcon}>{goal.icon}</Text>
                  <View style={styles.goalTextWrap}>
                    <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>
                      {goal.label}
                    </Text>
                    <Text style={styles.goalHint}>{goal.hint}</Text>
                  </View>
                  {active ? <Text style={styles.goalCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
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

        <Animated.View style={[styles.testimonialCard, { opacity: testimonialOpacity }]}>
          <Text style={styles.testimonialQuoteMark}>“</Text>
          <Text style={styles.testimonialQuote}>{testimonial.quote}</Text>
          <View style={styles.testimonialFooter}>
            <Text style={styles.testimonialAuthor}>{testimonial.author}</Text>
            <Text style={styles.testimonialMeta}>{testimonial.meta}</Text>
          </View>
          <View style={styles.testimonialDots}>
            {TESTIMONIALS.map((_, i) => (
              <View
                key={i}
                style={[styles.testimonialDot, i === testimonialIdx && styles.testimonialDotActive]}
              />
            ))}
          </View>
        </Animated.View>

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
  headlineWrap: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: premium.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  personasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 10,
  },
  personaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  personaChipTxt: {
    color: premium.accentBlue,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  slogan: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
    color: premium.textMuted,
    textAlign: 'center',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    color: premium.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  statLabel: {
    marginTop: 4,
    color: premium.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  goalsBlock: {
    marginBottom: 18,
  },
  goalsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 4,
  },
  goalsSubtitle: {
    fontSize: 13,
    color: premium.textMuted,
    marginBottom: 12,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexBasis: '48%',
    flexGrow: 1,
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  goalChipActive: {
    borderColor: 'rgba(56,189,248,0.7)',
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  goalChipPressed: {
    transform: [{ scale: 0.98 }],
  },
  goalIcon: {
    fontSize: 22,
  },
  goalTextWrap: {
    flex: 1,
  },
  goalLabel: {
    color: premium.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  goalLabelActive: {
    color: premium.accentBlue,
  },
  goalHint: {
    color: premium.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  goalCheck: {
    color: premium.accentBlue,
    fontSize: 16,
    fontWeight: '900',
  },
  testimonialCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(8,16,28,0.6)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 18,
    minHeight: 156,
  },
  testimonialQuoteMark: {
    color: 'rgba(56,189,248,0.35)',
    fontSize: 40,
    lineHeight: 32,
    fontWeight: '900',
    marginBottom: 4,
  },
  testimonialQuote: {
    color: premium.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  testimonialFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 6,
  },
  testimonialAuthor: {
    color: premium.text,
    fontSize: 13,
    fontWeight: '800',
  },
  testimonialMeta: {
    color: premium.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  testimonialDots: {
    position: 'absolute',
    right: 14,
    top: 14,
    flexDirection: 'row',
    gap: 4,
  },
  testimonialDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  testimonialDotActive: {
    backgroundColor: premium.accentBlue,
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
