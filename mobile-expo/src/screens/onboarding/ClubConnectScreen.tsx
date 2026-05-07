import {
  Alert,
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const SLIDER_CARD_WIDTH = 220;
const SLIDER_CARD_GAP = 12;
const SLIDER_STEP = SLIDER_CARD_WIDTH + SLIDER_CARD_GAP;
const SLIDER_TRACK_WIDTH = SLIDER_STEP * FEATURED_CLUBS.length;
const SLIDER_PER_CARD_MS = 12000;
const SLIDER_DURATION_MS = SLIDER_PER_CARD_MS * FEATURED_CLUBS.length;

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
  searchKey: string;
  matchKeywords: string[];
};

const GOALS: Goal[] = [
  {
    id: 'fat-loss',
    icon: '🔥',
    label: 'Form & Kilo',
    hint: 'Yağ yak, fit kal',
    searchKey: 'form',
    matchKeywords: ['form', 'kilo', 'beslenme', 'yağ', 'hiit'],
  },
  {
    id: 'strength',
    icon: '💪',
    label: 'Kuvvet',
    hint: 'Kas & güç',
    searchKey: 'kuvvet',
    matchKeywords: ['kuvvet', 'crossfit', 'kas', 'güç'],
  },
  {
    id: 'yoga',
    icon: '🧘',
    label: 'Yoga & Pilates',
    hint: 'Esneklik & nefes',
    searchKey: 'yoga',
    matchKeywords: ['yoga', 'pilates', 'reformer', 'esneklik', 'nefes', 'postür'],
  },
  {
    id: 'performance',
    icon: '🏃',
    label: 'Performans',
    hint: 'Sporcu seviyesi',
    searchKey: 'performans',
    matchKeywords: ['performans', 'atletik', 'koşu', 'sporcu'],
  },
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

type Trainer = {
  id: string;
  name: string;
  specialties: string[];
  clubName: string;
  ratingValue: string;
  reviewCount: number;
  initials: string;
  accentColor: string;
};

const TRAINERS: Trainer[] = [
  {
    id: 't-burcu',
    name: 'Burcu A.',
    specialties: ['Yoga', 'Reformer'],
    clubName: "O'Wellness Sky",
    ratingValue: '4.9',
    reviewCount: 124,
    initials: 'BA',
    accentColor: '#7c3aed',
  },
  {
    id: 't-emre',
    name: 'Emre K.',
    specialties: ['Kuvvet', 'CrossFit'],
    clubName: 'Skyland Wellness',
    ratingValue: '4.8',
    reviewCount: 98,
    initials: 'EK',
    accentColor: '#ef4444',
  },
  {
    id: 't-selin',
    name: 'Selin D.',
    specialties: ['Beslenme', 'Form'],
    clubName: "O'Wellness Dragos",
    ratingValue: '5.0',
    reviewCount: 156,
    initials: 'SD',
    accentColor: '#0ea5e9',
  },
  {
    id: 't-mert',
    name: 'Mert T.',
    specialties: ['Performans', 'Atletik'],
    clubName: "O'Wellness Yalıkavak",
    ratingValue: '4.9',
    reviewCount: 87,
    initials: 'MT',
    accentColor: '#22c55e',
  },
  {
    id: 't-zeynep',
    name: 'Zeynep G.',
    specialties: ['Pilates', 'Postür'],
    clubName: 'Skyland Wellness',
    ratingValue: '4.7',
    reviewCount: 203,
    initials: 'ZG',
    accentColor: '#f59e0b',
  },
];

const TRAINER_CARD_WIDTH = 184;
const TRAINER_GAP = 12;
const TRAINER_STEP = TRAINER_CARD_WIDTH + TRAINER_GAP;
const TRAINER_TRACK_WIDTH = TRAINER_STEP * TRAINERS.length;
const TRAINER_DURATION_MS = 11000 * TRAINERS.length;

type EventItem = {
  id: string;
  emoji: string;
  title: string;
  when: string;
  clubName: string;
  capacityLabel: string;
  urgent?: boolean;
  accentBg: string;
  accentBorder: string;
};

const EVENTS: EventItem[] = [
  {
    id: 'e-sunset-yoga',
    emoji: '🌅',
    title: 'Sunset Yoga',
    when: 'Cuma · 19:00',
    clubName: "O'Wellness Yalıkavak",
    capacityLabel: '7 kontenjan',
    urgent: true,
    accentBg: 'rgba(124,58,237,0.18)',
    accentBorder: 'rgba(124,58,237,0.45)',
  },
  {
    id: 'e-hiit',
    emoji: '🔥',
    title: 'HIIT Workshop',
    when: 'Cumartesi · 11:00',
    clubName: 'Skyland Wellness',
    capacityLabel: '12 kontenjan',
    accentBg: 'rgba(239,68,68,0.18)',
    accentBorder: 'rgba(239,68,68,0.45)',
  },
  {
    id: 'e-nutrition',
    emoji: '🥗',
    title: 'Beslenme Semineri',
    when: 'Pazar · 15:00',
    clubName: "O'Wellness Sky",
    capacityLabel: '23 kontenjan',
    accentBg: 'rgba(34,197,94,0.18)',
    accentBorder: 'rgba(34,197,94,0.45)',
  },
  {
    id: 'e-reformer',
    emoji: '🧘',
    title: 'Reformer Master Class',
    when: 'Pazartesi · 18:30',
    clubName: "O'Wellness Dragos",
    capacityLabel: '4 kontenjan',
    urgent: true,
    accentBg: 'rgba(14,165,233,0.18)',
    accentBorder: 'rgba(14,165,233,0.45)',
  },
  {
    id: 'e-running',
    emoji: '🏃',
    title: 'Açık Hava Koşusu',
    when: 'Cumartesi · 07:00',
    clubName: "O'Wellness Sky",
    capacityLabel: 'Sınırsız',
    accentBg: 'rgba(245,158,11,0.18)',
    accentBorder: 'rgba(245,158,11,0.45)',
  },
];

const EVENT_CARD_WIDTH = SLIDER_CARD_WIDTH;
const EVENT_GAP = SLIDER_CARD_GAP;
const EVENT_STEP = EVENT_CARD_WIDTH + EVENT_GAP;
const EVENT_TRACK_WIDTH = EVENT_STEP * EVENTS.length;
const EVENT_DURATION_MS = SLIDER_PER_CARD_MS * EVENTS.length;

export function ClubConnectScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { tenantDirectory, loadTenantDirectory } = useMemberAuth();
  const [previewClub, setPreviewClub] = useState<TenantListRow | null>(null);
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<Goal['id'] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const sliderX = useRef(new Animated.Value(0)).current;
  const trainerX = useRef(new Animated.Value(0)).current;
  const eventX = useRef(new Animated.Value(0)).current;
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
    trainerX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(trainerX, {
        toValue: -TRAINER_TRACK_WIDTH,
        duration: TRAINER_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [trainerX]);

  useEffect(() => {
    eventX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(eventX, {
        toValue: -EVENT_TRACK_WIDTH,
        duration: EVENT_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [eventX]);

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

  useEffect(() => {
    if (!selectedGoal) {
      setSearchQuery('');
      setSubmittedQuery(null);
      return;
    }
    const goal = GOALS.find((g) => g.id === selectedGoal);
    if (goal) {
      setSearchQuery(goal.searchKey);
      setSubmittedQuery(null);
    }
  }, [selectedGoal]);

  const handleRunSearch = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
  };

  const goalForResults = selectedGoal ? (GOALS.find((g) => g.id === selectedGoal) ?? null) : null;
  const submittedTerm = submittedQuery?.toLocaleLowerCase('tr-TR') ?? '';
  const matchKeywords = goalForResults?.matchKeywords ?? [];

  const matchesQuery = (haystack: string) => {
    const hay = haystack.toLocaleLowerCase('tr-TR');
    if (submittedTerm && hay.includes(submittedTerm)) return true;
    return matchKeywords.some((kw) => hay.includes(kw));
  };

  const matchedTrainers = TRAINERS.filter((tr) =>
    matchesQuery([tr.name, tr.clubName, ...tr.specialties].join(' ')),
  );
  const fallbackTrainers = TRAINERS.filter((tr) => !matchedTrainers.includes(tr));
  const trainerResults = [...matchedTrainers, ...fallbackTrainers].slice(
    0,
    Math.max(3, matchedTrainers.length),
  );

  const matchedClubs = FEATURED_CLUBS.filter((club) =>
    matchesQuery([club.name, club.location, club.subdomain].join(' ')),
  );
  const fallbackClubs = FEATURED_CLUBS.filter((club) => !matchedClubs.includes(club));
  const clubResults = [...matchedClubs, ...fallbackClubs].slice(
    0,
    Math.max(3, matchedClubs.length),
  );

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

          {selectedGoal ? (
            <View style={styles.searchBlock}>
              <View style={styles.searchRow2}>
                <View style={styles.searchBox}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleRunSearch}
                    placeholder="Eğitmen, kulüp veya semt ara..."
                    placeholderTextColor={premium.textMuted}
                    style={styles.searchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {searchQuery ? (
                    <Pressable hitSlop={8} onPress={() => setSearchQuery('')}>
                      <Text style={styles.searchClear}>×</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  onPress={handleRunSearch}
                  disabled={!searchQuery.trim()}
                  style={({ pressed }) => [
                    styles.searchBtn,
                    !searchQuery.trim() && styles.searchBtnDisabled,
                    pressed && styles.searchBtnPressed,
                  ]}
                >
                  <Text style={styles.searchBtnTxt}>Ara</Text>
                </Pressable>
              </View>
              {!submittedQuery ? (
                <Text style={styles.searchHelp}>
                  Otomatik olarak hedefine göre dolduruldu — istersen değiştir, sonra Ara'ya bas.
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {selectedGoal && submittedQuery ? (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle} numberOfLines={2}>
                "{submittedQuery}" için sana özel öneriler
              </Text>
              <Pressable
                onPress={() => setSubmittedQuery(null)}
                hitSlop={8}
                style={styles.resultsClose}
              >
                <Text style={styles.resultsCloseTxt}>Temizle</Text>
              </Pressable>
            </View>

            <Text style={styles.resultsSubtitle}>
              {matchedTrainers.length + matchedClubs.length} eşleşme · {trainerResults.length}{' '}
              eğitmen · {clubResults.length} kulüp
            </Text>

            <Text style={styles.resultsGroupLabel}>EĞİTMENLER</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.resultsScrollInner}
            >
              {trainerResults.map((trainer) => {
                const isMatch = matchedTrainers.includes(trainer);
                return (
                  <Pressable
                    key={`r-${trainer.id}`}
                    onPress={() =>
                      Alert.alert(
                        trainer.name,
                        `${trainer.specialties.join(' · ')}\n${trainer.clubName}\n\nEğitmen profili ve rezervasyon yakında.`,
                      )
                    }
                    style={({ pressed }) => [
                      styles.trainerCard,
                      isMatch && styles.resultCardMatched,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    {isMatch ? (
                      <View style={styles.resultMatchBadge}>
                        <Text style={styles.resultMatchBadgeTxt}>EŞLEŞME</Text>
                      </View>
                    ) : null}
                    <View style={[styles.trainerAvatar, { backgroundColor: trainer.accentColor }]}>
                      <Text style={styles.trainerAvatarTxt}>{trainer.initials}</Text>
                    </View>
                    <Text style={styles.trainerName} numberOfLines={1}>
                      {trainer.name}
                    </Text>
                    <View style={styles.trainerSpecRow}>
                      {trainer.specialties.map((spec) => (
                        <View key={spec} style={styles.trainerSpecChip}>
                          <Text style={styles.trainerSpecTxt}>{spec}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.trainerRatingRow}>
                      <Text style={styles.trainerRatingValue}>★ {trainer.ratingValue}</Text>
                      <Text style={styles.trainerRatingMeta}>· {trainer.reviewCount}</Text>
                    </View>
                    <Text style={styles.trainerClub} numberOfLines={1}>
                      {trainer.clubName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.resultsGroupLabel, styles.resultsGroupLabelSpaced]}>KULÜPLER</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.resultsScrollInner}
            >
              {clubResults.map((club) => {
                const isMatch = matchedClubs.includes(club);
                const directoryMatch = tenantDirectory.find(
                  (row) => row.subdomain === club.subdomain,
                );
                return (
                  <Pressable
                    key={`r-${club.id}`}
                    onPress={() => {
                      setPreviewClub(
                        directoryMatch ?? {
                          id: club.id,
                          name: club.name,
                          subdomain: club.subdomain,
                          logoUrl: null,
                        },
                      );
                    }}
                    style={({ pressed }) => [
                      styles.clubCard,
                      club.featured && styles.clubCardFeatured,
                      isMatch && styles.resultCardMatched,
                      pressed && styles.clubCardPressed,
                    ]}
                  >
                    {isMatch ? (
                      <View style={styles.resultMatchBadge}>
                        <Text style={styles.resultMatchBadgeTxt}>EŞLEŞME</Text>
                      </View>
                    ) : club.featured ? (
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
            </ScrollView>
          </View>
        ) : null}

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

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
            <Text style={styles.sectionSubtitle}>
              Üye olmadan da incele, kontenjanı kapanmadan yerini ayır.
            </Text>
          </View>
        </View>

        <View style={styles.sliderViewport} pointerEvents="box-none">
          <Animated.View style={[styles.sliderTrack, { transform: [{ translateX: eventX }] }]}>
            {[...EVENTS, ...EVENTS].map((evt, idx) => (
              <Pressable
                key={`${evt.id}-${idx}`}
                onPress={() =>
                  Alert.alert(
                    evt.title,
                    `${evt.when}\n${evt.clubName}\n${evt.capacityLabel}\n\nKayıt akışı yakında.`,
                  )
                }
                style={({ pressed }) => [
                  styles.eventCard,
                  { borderColor: evt.accentBorder },
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={[styles.eventCover, { backgroundColor: evt.accentBg }]}>
                  <Text style={styles.eventEmoji}>{evt.emoji}</Text>
                  {evt.urgent ? (
                    <View style={styles.eventUrgentBadge}>
                      <Text style={styles.eventUrgentTxt}>SON KONTENJAN</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {evt.title}
                </Text>
                <View style={styles.eventMetaRow}>
                  <Text style={styles.eventMetaTxt}>{evt.when}</Text>
                </View>
                <Text style={styles.eventClub} numberOfLines={1}>
                  {evt.clubName}
                </Text>
                <View style={styles.eventCapacityRow}>
                  <Text style={[styles.eventCapacityTxt, evt.urgent && styles.eventCapacityUrgent]}>
                    {evt.capacityLabel}
                  </Text>
                  <Text style={styles.eventCtaArrow}>›</Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>
          <View pointerEvents="none" style={[styles.sliderFade, styles.sliderFadeLeft]} />
          <View pointerEvents="none" style={[styles.sliderFade, styles.sliderFadeRight]} />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Öne çıkan eğitmenler</Text>
            <Text style={styles.sectionSubtitle}>
              Sertifikalı, doğrulanmış ve kullanıcılar tarafından derecelendirilmiş.
            </Text>
          </View>
        </View>

        <View style={styles.sliderViewport} pointerEvents="box-none">
          <Animated.View style={[styles.sliderTrack, { transform: [{ translateX: trainerX }] }]}>
            {[...TRAINERS, ...TRAINERS].map((trainer, idx) => (
              <Pressable
                key={`${trainer.id}-${idx}`}
                onPress={() =>
                  Alert.alert(
                    trainer.name,
                    `${trainer.specialties.join(' · ')}\n${trainer.clubName}\n\nEğitmen profili ve rezervasyon yakında.`,
                  )
                }
                style={({ pressed }) => [styles.trainerCard, pressed && styles.cardPressed]}
              >
                <View style={[styles.trainerAvatar, { backgroundColor: trainer.accentColor }]}>
                  <Text style={styles.trainerAvatarTxt}>{trainer.initials}</Text>
                </View>
                <Text style={styles.trainerName} numberOfLines={1}>
                  {trainer.name}
                </Text>
                <View style={styles.trainerSpecRow}>
                  {trainer.specialties.map((spec) => (
                    <View key={spec} style={styles.trainerSpecChip}>
                      <Text style={styles.trainerSpecTxt}>{spec}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.trainerRatingRow}>
                  <Text style={styles.trainerRatingValue}>★ {trainer.ratingValue}</Text>
                  <Text style={styles.trainerRatingMeta}>· {trainer.reviewCount}</Text>
                </View>
                <Text style={styles.trainerClub} numberOfLines={1}>
                  {trainer.clubName}
                </Text>
              </Pressable>
            ))}
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

          <Text style={styles.ctaChipsTitle}>Veya farklı bir yolla başla</Text>
          <View style={styles.ctaChipsRow}>
            <Pressable
              onPress={() =>
                navigation.navigate('Register', {
                  preselectedSubdomain: 'demo',
                  preselectedGoal: selectedGoal ?? undefined,
                })
              }
              style={({ pressed }) => [
                styles.ctaChip,
                styles.ctaChipDemo,
                pressed && styles.ctaChipPressed,
              ]}
            >
              <Text style={styles.ctaChipIcon}>🎬</Text>
              <Text style={styles.ctaChipLabel}>Demo ile başla</Text>
              <Text style={styles.ctaChipHint}>Kayıt olmadan tur at</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('TrainerRegister')}
              style={({ pressed }) => [
                styles.ctaChip,
                styles.ctaChipTrainer,
                pressed && styles.ctaChipPressed,
              ]}
            >
              <Text style={styles.ctaChipIcon}>👟</Text>
              <Text style={styles.ctaChipLabel}>Eğitmen başvurusu</Text>
              <Text style={styles.ctaChipHint}>Hizmet vermek istiyorum</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('CorporateEntry')}
              style={({ pressed }) => [
                styles.ctaChip,
                styles.ctaChipCorporate,
                pressed && styles.ctaChipPressed,
              ]}
            >
              <Text style={styles.ctaChipIcon}>🏢</Text>
              <Text style={styles.ctaChipLabel}>Kurumsal kayıt</Text>
              <Text style={styles.ctaChipHint}>Kulüp / şirket olarak</Text>
            </Pressable>
          </View>
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
                      preselectedGoal: selectedGoal ?? undefined,
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
  searchBlock: {
    marginTop: 14,
  },
  searchRow2: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.45)',
    backgroundColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    minHeight: 48,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: premium.text,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 10,
  },
  searchClear: {
    color: premium.textMuted,
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  searchBtn: {
    paddingHorizontal: 18,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.7)',
    backgroundColor: 'rgba(56,189,248,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.45,
  },
  searchBtnPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: 'rgba(56,189,248,0.3)',
  },
  searchBtnTxt: {
    color: premium.accentBlue,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  searchHelp: {
    color: premium.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  resultsSection: {
    marginTop: 4,
    marginBottom: 18,
    marginHorizontal: -22,
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 22,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    backgroundColor: 'rgba(56,189,248,0.05)',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  resultsTitle: {
    flex: 1,
    color: premium.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  resultsClose: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resultsCloseTxt: {
    color: premium.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  resultsSubtitle: {
    color: premium.accentBlue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  resultsGroupLabel: {
    color: premium.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  resultsGroupLabelSpaced: {
    marginTop: 16,
  },
  resultsScrollInner: {
    gap: 12,
    paddingRight: 22,
  },
  resultCardMatched: {
    borderColor: 'rgba(56,189,248,0.7)',
    backgroundColor: 'rgba(14,28,46,0.85)',
  },
  resultMatchBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(56,189,248,0.92)',
    zIndex: 2,
  },
  resultMatchBadgeTxt: {
    color: '#02121f',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
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
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
    padding: 8,
    overflow: 'hidden',
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
  sectionHeader: {
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: premium.textMuted,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  trainerCard: {
    width: TRAINER_CARD_WIDTH,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(8,16,28,0.7)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  trainerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  trainerAvatarTxt: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  trainerName: {
    color: premium.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  trainerSpecRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    marginBottom: 8,
  },
  trainerSpecChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  trainerSpecTxt: {
    color: premium.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  trainerRatingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  trainerRatingValue: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '900',
  },
  trainerRatingMeta: {
    color: premium.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  trainerClub: {
    color: premium.accentBlue,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  eventCard: {
    width: EVENT_CARD_WIDTH,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(8,16,28,0.7)',
    overflow: 'hidden',
  },
  eventCover: {
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eventEmoji: {
    fontSize: 38,
  },
  eventUrgentBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.92)',
  },
  eventUrgentTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  eventTitle: {
    color: premium.text,
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  eventMetaRow: {
    paddingHorizontal: 14,
    marginTop: 4,
  },
  eventMetaTxt: {
    color: premium.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  eventClub: {
    color: premium.accentBlue,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 14,
    marginTop: 4,
  },
  eventCapacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: premium.glassBorder,
  },
  eventCapacityTxt: {
    color: premium.text,
    fontSize: 12,
    fontWeight: '800',
  },
  eventCapacityUrgent: {
    color: '#f87171',
  },
  eventCtaArrow: {
    color: premium.accentBlue,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 18,
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
  ctaChipsTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: '800',
    color: premium.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  ctaChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ctaChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  ctaChipDemo: {
    borderColor: 'rgba(34,197,94,0.45)',
  },
  ctaChipTrainer: {
    borderColor: 'rgba(245,158,11,0.45)',
  },
  ctaChipCorporate: {
    borderColor: 'rgba(124,58,237,0.45)',
  },
  ctaChipPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ctaChipIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  ctaChipLabel: {
    color: premium.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  ctaChipHint: {
    marginTop: 2,
    color: premium.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
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
