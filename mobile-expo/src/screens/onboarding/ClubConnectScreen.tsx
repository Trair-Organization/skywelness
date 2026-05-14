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
import * as WebBrowser from 'expo-web-browser';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import type { TenantListRow } from '../../auth/memberAuthTypes';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { LeadCaptureModal } from '../../components/premium/LeadCaptureModal';
import { EventDetailModal } from '../../components/premium/EventDetailModal';
import { CampaignDetailModal } from '../../components/premium/CampaignDetailModal';
import { JoinRequestModal } from '../../components/premium/JoinRequestModal';
import { showToast } from '../../components/premium/Toast';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';
import { persistLanguage } from '../../i18n';
import { apiJson, ApiError } from '../../api/client';

const logoLight = require('../../../assets/branding/wellness-club-logo-header.png');

type FeaturedClub = {
  id: string;
  name: string;
  subdomain: string;
  location: string;
  logo: ImageSourcePropType;
  featured?: boolean;
};

const FEATURED_CLUBS: FeaturedClub[] = [];

type Nav = NativeStackNavigationProp<RootStackParamList, 'ClubConnect'>;

type PublicCampaign = {
  id: string;
  title: string;
  description: string | null;
  campaignType: 'massage_package' | 'membership' | 'personal_training' | 'general';
  discountKind: 'percentage' | 'fixed';
  discountValue: string;
  originalPrice: string | null;
  discountedPrice: string | null;
  terms: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
  maxRedemptions: number | null;
  redemptionCount: number;
  tenant?: { id: string; name: string; subdomain: string };
};

type DiscoveryClub = {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  location: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  services: string[];
  priceRange: string | null;
  featured: boolean;
  avgRating: string;
  reviewCount: number;
  /** Partner kulüp görünürlük modu. Field eksikse güvenli fallback: private. */
  visibilityMode?: 'public' | 'private';
  vertical?: string;
};

type DiscoveryTrainer = {
  id: string;
  userId?: string;
  name: string;
  photoUrl: string | null;
  city: string;
  bio: string;
  specialties: string[];
  experienceYears: number | null;
  pricingNote: string | null;
  avgRating: string;
  totalSessions: number;
  clubName: string;
  clubSubdomain: string;
};

type DiscoveryEvent = {
  id: string;
  title: string;
  description: string | null;
  coachName: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  category?: string;
  requirements?: string | null;
  schedule?: Array<{ time: string; title: string }> | null;
  price?: string | null;
  currency?: string | null;
  clubName: string | null;
  clubSubdomain: string | null;
};

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

const TESTIMONIALS: Testimonial[] = [];

const TESTIMONIAL_ROTATE_MS = 6000;

type Trainer = {
  id: string;
  name: string;
  specialties: string[];
  clubName: string;
  clubSubdomain: string;
  ratingValue: string;
  reviewCount: number;
  initials: string;
  accentColor: string;
  goalId: Goal['id'];
  bio: string;
  pricePerSession: string;
};

const TRAINERS: Trainer[] = [];

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

const EVENTS: EventItem[] = [];

const EVENT_CARD_WIDTH = SLIDER_CARD_WIDTH;
const EVENT_GAP = SLIDER_CARD_GAP;
const EVENT_STEP = EVENT_CARD_WIDTH + EVENT_GAP;
const EVENT_TRACK_WIDTH = EVENT_STEP * EVENTS.length;
const EVENT_DURATION_MS = SLIDER_PER_CARD_MS * EVENTS.length;

export function ClubConnectScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { tenantDirectory, loadTenantDirectory, user, token, tenant } = useMemberAuth();
  const isAuthenticated = Boolean(user && token);
  const [myMemberships, setMyMemberships] = useState<
    Array<{
      membershipId: string;
      role: string;
      accountStatus: string;
      isCurrent: boolean;
      tenant: {
        id: string;
        name: string;
        subdomain: string;
        logoUrl: string | null;
        location: string | null;
        services: string[];
        featured: boolean;
        visibilityMode?: 'public' | 'private';
      };
    }>
  >([]);
  const [joinRequestTarget, setJoinRequestTarget] = useState<{
    name: string;
    subdomain: string;
  } | null>(null);
  const [previewClub, setPreviewClub] = useState<TenantListRow | null>(null);
  const [previewTrainer, setPreviewTrainer] = useState<Trainer | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<PublicCampaign | null>(null);
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DiscoveryEvent | null>(null);
  const [leadModal, setLeadModal] = useState<{
    visible: boolean;
    source: 'club' | 'trainer' | 'campaign' | 'event';
    sourceRef?: string;
    sourceLabel?: string;
    clubSubdomain?: string;
    prefillMessage?: string;
  }>({ visible: false, source: 'club' });
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<Goal['id'] | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const sliderX = useRef(new Animated.Value(0)).current;
  const trainerX = useRef(new Animated.Value(0)).current;
  const eventX = useRef(new Animated.Value(0)).current;
  const clubX = useRef(new Animated.Value(0)).current;
  const headlineOpacity = useRef(new Animated.Value(1)).current;
  const testimonialOpacity = useRef(new Animated.Value(1)).current;
  const runSafe = (fn?: () => Promise<unknown> | unknown) => {
    if (typeof fn !== 'function') {
      return;
    }
    Promise.resolve(fn()).catch(() => {});
  };

  /** Chat ekranına yönlendir — tab içinden ya da root'tan çalışır. */
  const navigateToChat = (chatParams: {
    conversationId: string;
    otherUser: {
      id: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
    };
  }) => {
    const nav = navigation as unknown as {
      navigate: (...args: unknown[]) => void;
      getState?: () => { routeNames?: string[] };
    };
    const state = nav.getState?.();
    // Eğer bulunduğumuz navigator'de 'Chat' route'u varsa direkt navigate et.
    if (state?.routeNames?.includes('Chat')) {
      nav.navigate('Chat', chatParams);
    } else {
      // Değilse Main tab navigator'ın Chat'ine git.
      nav.navigate('Main', { screen: 'Chat', params: chatParams });
    }
  };

  // ─── Auth-aware helpers ──────────────────────────────────────────
  // Giriş yapmış kullanıcı → direkt mesajlaşma/join çalışsın
  // Giriş yapmamış kullanıcı → LeadCaptureModal göster (mevcut davranış)

  /** Kulüp ile iletişime geç: girişli kullanıcı → admin ile sohbet başlat */
  const contactClub = async (params: {
    clubSubdomain: string;
    clubName: string;
    clubId?: string;
    prefillMessage?: string;
  }) => {
    if (isAuthenticated && token && tenant) {
      try {
        const res = await apiJson<{ conversationId: string }>('/messages/conversations/club', {
          method: 'POST',
          token,
          tenantSubdomain: params.clubSubdomain,
        });
        showToast(`${params.clubName} ile sohbet başladı`, 'success');
        navigateToChat({
          conversationId: res.conversationId,
          otherUser: {
            id: '',
            firstName: params.clubName,
            lastName: '',
            photoUrl: null,
          },
        });
      } catch {
        showToast('Kulübe mesaj başlatılamadı', 'error');
      }
      return;
    }
    setLeadModal({
      visible: true,
      source: 'club',
      sourceRef: params.clubId,
      sourceLabel: params.clubName,
      clubSubdomain: params.clubSubdomain,
      prefillMessage: params.prefillMessage ?? `${params.clubName} hakkında bilgi almak istiyorum.`,
    });
  };

  /** Eğitmen ile iletişime geç */
  const contactTrainer = async (params: {
    trainerId: string;
    trainerUserId?: string;
    trainerName: string;
    clubName: string;
    clubSubdomain: string;
    prefillMessage?: string;
  }) => {
    if (isAuthenticated && token && tenant) {
      if (!params.trainerUserId) {
        showToast('Eğitmen bilgisi yüklenemedi', 'error');
        return;
      }
      try {
        const res = await apiJson<{ conversationId: string }>('/messages/conversations', {
          method: 'POST',
          token,
          tenantSubdomain: tenant.subdomain,
          body: JSON.stringify({ otherUserId: params.trainerUserId }),
        });
        const nameParts = params.trainerName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        navigateToChat({
          conversationId: res.conversationId,
          otherUser: {
            id: params.trainerUserId,
            firstName,
            lastName,
            photoUrl: null,
          },
        });
      } catch {
        showToast('Mesaj başlatılamadı', 'error');
      }
      return;
    }
    setLeadModal({
      visible: true,
      source: 'trainer',
      sourceRef: params.trainerId,
      sourceLabel: `${params.trainerName} — ${params.clubName}`,
      clubSubdomain: params.clubSubdomain,
      prefillMessage:
        params.prefillMessage ?? `${params.trainerName} eğitmen hakkında bilgi almak istiyorum.`,
    });
  };

  /** Etkinliğe katıl: girişli → direkt katıl veya checkout, girişsiz → lead modal */
  const joinEventAction = async (evt: DiscoveryEvent) => {
    const eventPrice = parseFloat(evt.price || '0');
    const isPaidEvent = eventPrice > 0;

    if (isAuthenticated && token && tenant) {
      if (isPaidEvent) {
        // Ücretli etkinlik → Stripe checkout (kapora)
        try {
          const res = await apiJson<{ checkoutUrl: string }>(`/v2/events/${evt.id}/checkout`, {
            method: 'POST',
            token,
            tenantSubdomain: tenant.subdomain,
            body: JSON.stringify({ userId: user?.id }),
          });
          if (res.checkoutUrl) {
            const result = await WebBrowser.openAuthSessionAsync(
              res.checkoutUrl,
              'wellnessclubai://booking-success',
            );
            setSelectedEvent(null);
            if (result.type === 'success') {
              showToast('Ödeme başarılı! Etkinlik biletiniz e-postanıza gönderildi 🎉', 'success');
            } else if (result.type === 'cancel') {
              showToast('Ödeme iptal edildi', 'warning');
            }
          }
        } catch (e) {
          showToast(e instanceof ApiError ? e.message : 'Ödeme başlatılamadı', 'error');
        }
      } else {
        // Ücretsiz etkinlik → direkt katıl
        try {
          await apiJson(`/events/${evt.id}/join`, {
            method: 'POST',
            token,
            tenantSubdomain: tenant.subdomain,
          });
          showToast('Etkinliğe katıldınız! ✓', 'success');
          setSelectedEvent(null);
        } catch (e) {
          if (e instanceof ApiError && e.message.toLowerCase().includes('already')) {
            showToast('Zaten katıldınız', 'info');
          } else {
            showToast(e instanceof ApiError ? e.message : 'Katılım başarısız', 'error');
          }
        }
      }
      return;
    }
    // Giriş yapmamış → register'a yönlendir (EventDetailModal'daki butonlar zaten bunu yapıyor)
    setSelectedEvent(null);
    setLeadModal({
      visible: true,
      source: 'event',
      sourceRef: evt.id,
      sourceLabel: evt.title,
      clubSubdomain: evt.clubSubdomain ?? undefined,
      prefillMessage: `${evt.title} etkinliğine katılmak istiyorum.`,
    });
  };

  /**
   * Kulüp kartı için CTA durumunu hesapla.
   * Requirements 6.4-6.8.
   *
   * - Public kulüp: her zaman book (zaten üye olsa bile direkt rezervasyon)
   * - Private kulüp:
   *   - Active üye → enter
   *   - Pending → 'pending' (disabled)
   *   - Rejected → 'rejected' (disabled)
   *   - Üye değil → 'join'
   *
   * Backend visibilityMode göndermezse güvenli fallback: private.
   */
  type ClubCta = 'book' | 'enter' | 'join' | 'pending' | 'rejected';
  const resolveClubCta = (club: DiscoveryClub): ClubCta => {
    const visibilityMode = club.visibilityMode ?? 'private';
    const membership = myMemberships.find((m) => m.tenant.subdomain === club.subdomain);

    if (visibilityMode === 'public') {
      // Public kulüpte, kullanıcı girişli de olsa değilse de rezervasyon direkt
      return 'book';
    }
    // private
    if (!membership) return isAuthenticated ? 'join' : 'join';
    if (membership.accountStatus === 'active') return 'enter';
    if (membership.accountStatus === 'pending_approval') return 'pending';
    if (membership.accountStatus === 'rejected') return 'rejected';
    return 'join';
  };

  const handleClubCta = (club: DiscoveryClub, cta: ClubCta) => {
    if (cta === 'book') {
      // Giriş yapmamış olsa bile kulüp detay sayfasına git — orada misafir ödeme akışı var
      (navigation as unknown as { navigate: (n: string, p?: unknown) => void }).navigate(
        'PartnerProfile',
        { subdomain: club.subdomain },
      );
      return;
    }
    if (cta === 'enter') {
      (navigation as unknown as { navigate: (n: string, p?: unknown) => void }).navigate('Main');
      return;
    }
    if (cta === 'join') {
      if (!isAuthenticated) {
        // Giriş yapmamış → Register ekranına yönlendir, kulüp otomatik seçili
        (navigation as unknown as { navigate: (n: string, p?: unknown) => void }).navigate(
          'Register',
          { preselectedSubdomain: club.subdomain },
        );
        return;
      }
      setJoinRequestTarget({ name: club.name, subdomain: club.subdomain });
      return;
    }
    if (cta === 'pending') {
      showToast('Başvurunuz onay bekliyor', 'info');
      return;
    }
    if (cta === 'rejected') {
      showToast('Başvurunuz daha önce reddedildi', 'warning');
      return;
    }
  };

  const ctaLabel = (cta: ClubCta): string => {
    switch (cta) {
      case 'book':
        return '🎾 Rezervasyon Yap';
      case 'enter':
        return '🏠 Kulübe Git';
      case 'join':
        return '📨 Üyelik Başvurusu';
      case 'pending':
        return '⏳ Onay bekleniyor';
      case 'rejected':
        return '❌ Başvuru reddedildi';
    }
  };

  useEffect(() => {
    Promise.resolve(loadTenantDirectory()).catch(() => {});
  }, [loadTenantDirectory]);

  // Giriş yapmış kullanıcının üye olduğu kulüpler (email ile eşleşen tüm tenant'lar)
  useEffect(() => {
    if (!isAuthenticated || !token || !tenant) {
      setMyMemberships([]);
      return;
    }
    apiJson<typeof myMemberships>('/auth/my-memberships', {
      token,
      tenantSubdomain: tenant.subdomain,
    })
      .then((rows) => setMyMemberships(rows))
      .catch(() => setMyMemberships([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, tenant?.subdomain]);

  // Öne çıkan kampanyaları yükle
  useEffect(() => {
    apiJson<PublicCampaign[]>('/campaigns/featured?limit=6', { auth: false })
      .then((rows) => setCampaigns(rows))
      .catch(() => {});
  }, []);

  // Discovery API: Kulüpler, eğitmenler, etkinlikler
  const [apiClubs, setApiClubs] = useState<DiscoveryClub[]>([]);
  const [apiTrainers, setApiTrainers] = useState<DiscoveryTrainer[]>([]);
  const [apiEvents, setApiEvents] = useState<DiscoveryEvent[]>([]);

  useEffect(() => {
    apiJson<DiscoveryClub[]>('/discovery/clubs?limit=20', { auth: false })
      .then((rows) => setApiClubs(rows))
      .catch(() => {});
    apiJson<DiscoveryTrainer[]>('/discovery/trainers?limit=20', { auth: false })
      .then((rows) => setApiTrainers(rows))
      .catch(() => {});
    apiJson<DiscoveryEvent[]>('/discovery/events?limit=10', { auth: false })
      .then((rows) => setApiEvents(rows))
      .catch(() => {});
  }, []);

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
    if (apiTrainers.length === 0) return;
    const trackWidth = TRAINER_STEP * apiTrainers.length;
    const duration = 8000 * apiTrainers.length;
    trainerX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(trainerX, {
        toValue: -trackWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [trainerX, apiTrainers.length]);

  useEffect(() => {
    if (apiClubs.length === 0) return;
    const trackWidth = TRAINER_STEP * apiClubs.length;
    const duration = 10000 * apiClubs.length;
    clubX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(clubX, {
        toValue: -trackWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [clubX, apiClubs.length]);

  useEffect(() => {
    if (apiEvents.length === 0) return;
    const trackWidth = TRAINER_STEP * apiEvents.length;
    const duration = 8000 * apiEvents.length;
    eventX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(eventX, {
        toValue: -trackWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [eventX, apiEvents.length]);

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

  const headline =
    ROTATING_HEADLINES.length > 0
      ? ROTATING_HEADLINES[headlineIdx % ROTATING_HEADLINES.length]
      : null;
  const testimonial =
    TESTIMONIALS.length > 0 ? TESTIMONIALS[testimonialIdx % TESTIMONIALS.length] : null;

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
          {headline && (
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
          )}
          <Text style={styles.slogan}>{t('onboarding.ecosystemSlogan')}</Text>
        </View>

        <View style={styles.goalsBlock}>
          {/* Arama Çubuğu */}
          <View style={styles.searchBlock}>
            <View style={styles.searchRow2}>
              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (text.trim().length >= 2) {
                      setSubmittedQuery(text.trim());
                    } else if (!text.trim()) {
                      setSubmittedQuery(null);
                    }
                  }}
                  onSubmitEditing={handleRunSearch}
                  placeholder="Kulüp, eğitmen veya etkinlik ara..."
                  placeholderTextColor={premium.textMuted}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searchQuery ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      setSearchQuery('');
                      setSubmittedQuery(null);
                    }}
                  >
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

            {/* Kategori Chip'leri */}
            <View style={styles.catChipsRow}>
              {['Tümü', 'Kulüpler', 'Eğitmenler', 'Etkinlikler'].map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.catChip, !selectedGoal && cat === 'Tümü' && styles.catChipActive]}
                  onPress={() => {
                    if (cat === 'Tümü') {
                      setSelectedGoal(null);
                      setSearchQuery('');
                      setSubmittedQuery(null);
                    } else if (cat === 'Kulüpler') {
                      setSearchQuery('kulüp');
                      setSubmittedQuery('kulüp');
                      setSelectedGoal('fitness' as never);
                    } else if (cat === 'Eğitmenler') {
                      setSearchQuery('eğitmen');
                      setSubmittedQuery('eğitmen');
                      setSelectedGoal('fitness' as never);
                    } else if (cat === 'Etkinlikler') {
                      setSearchQuery('etkinlik');
                      setSubmittedQuery('etkinlik');
                      setSelectedGoal('fitness' as never);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      !selectedGoal && cat === 'Tümü' && styles.catChipTextActive,
                    ]}
                  >
                    {cat === 'Kulüpler'
                      ? '🏢'
                      : cat === 'Eğitmenler'
                        ? '🏋️'
                        : cat === 'Etkinlikler'
                          ? '📅'
                          : '✨'}{' '}
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Popüler Aramalar */}
            {!submittedQuery && (
              <View style={styles.popSearches}>
                <Text style={styles.popSearchTitle}>Popüler</Text>
                <View style={styles.popSearchRow}>
                  {['Yoga', 'Pilates', 'Fitness', 'Masaj', 'Padel'].map((term) => (
                    <Pressable
                      key={term}
                      style={styles.popSearchChip}
                      onPress={() => {
                        setSearchQuery(term);
                        setSubmittedQuery(term);
                        setSelectedGoal('fitness' as never);
                      }}
                    >
                      <Text style={styles.popSearchChipText}>{term}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
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
                    onPress={() => setPreviewTrainer(trainer)}
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
                    <Text style={styles.trainerSpecLine} numberOfLines={1}>
                      {trainer.specialties.join(' · ')}
                    </Text>
                    <View style={styles.trainerRatingRow}>
                      <Text style={styles.trainerRatingValue}>★ {trainer.ratingValue}</Text>
                      <Text style={styles.trainerRatingMeta}>· {trainer.reviewCount}</Text>
                    </View>
                    <Text style={styles.trainerClub} numberOfLines={1}>
                      {trainer.clubName}
                    </Text>
                    <View style={styles.trainerCtaPill}>
                      <Text style={styles.trainerCtaPillIcon}>💬</Text>
                      <Text style={styles.trainerCtaPillTxt}>İletişime Geç</Text>
                    </View>
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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.popularTitle}>🔥 Kampanyalar</Text>
            <Pressable
              onPress={() =>
                (navigation as unknown as { navigate: (n: string) => void }).navigate(
                  'AllCampaigns',
                )
              }
            >
              <Text style={styles.seeAllTxt}>Tümünü Gör →</Text>
            </Pressable>
          </View>
          <Text style={styles.popularSubtitle}>Özel fırsatları kaçırma!</Text>
        </View>

        {campaigns.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20, paddingLeft: 20 }}
            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
          >
            {campaigns.map((c) => {
              const discountLabel =
                c.discountKind === 'percentage'
                  ? `%${parseFloat(c.discountValue).toFixed(0)}`
                  : `${parseFloat(c.discountValue).toFixed(0)}₺`;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setPreviewCampaign(c)}
                  style={({ pressed }) => [styles.campaignCard, pressed && { opacity: 0.85 }]}
                >
                  {c.imageUrl ? (
                    <Image
                      source={{ uri: c.imageUrl }}
                      style={styles.campaignCardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.campaignCardImage,
                        {
                          backgroundColor: 'rgba(251,191,36,0.1)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 24 }}>🔥</Text>
                    </View>
                  )}
                  <View style={styles.campaignCardBody}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View style={styles.campaignDiscountBadge}>
                        <Text style={styles.campaignDiscountTxt}>{discountLabel}</Text>
                      </View>
                      {c.discountedPrice && (
                        <Text style={styles.campaignPrice}>
                          {parseFloat(c.discountedPrice).toLocaleString('tr-TR')}₺
                        </Text>
                      )}
                    </View>
                    <Text style={styles.campaignTitle} numberOfLines={2}>
                      {c.title}
                    </Text>
                    {c.tenant && <Text style={styles.campaignClub}>{c.tenant.name}</Text>}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.popularHeader}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.popularTitle}>Popüler Kulüpler</Text>
            <Pressable
              onPress={() =>
                (navigation as unknown as { navigate: (n: string) => void }).navigate('AllClubs')
              }
            >
              <Text style={styles.seeAllTxt}>Tümünü Gör →</Text>
            </Pressable>
          </View>
          <Text style={styles.popularSubtitle}>{t('onboarding.clubShowcaseSubtitle')}</Text>
        </View>

        {apiClubs.length > 0 && (
          <View style={styles.sliderViewport} pointerEvents="box-none">
            <Animated.View style={[styles.sliderTrack, { transform: [{ translateX: clubX }] }]}>
              {[...apiClubs, ...apiClubs].map((club, idx) => {
                const handlePress = () => {
                  // Profil sayfasına git — hem root stack hem tab navigator'dan çalışır
                  (
                    navigation as unknown as { navigate: (n: string, p?: unknown) => void }
                  ).navigate('PartnerProfile', { subdomain: club.subdomain });
                };
                const cta = resolveClubCta(club);
                const ctaDisabled = cta === 'pending' || cta === 'rejected';
                return (
                  <View key={`${club.id}-${idx}`} style={styles.clubCardWrapper}>
                    <Pressable
                      onPress={handlePress}
                      style={({ pressed }) => [styles.clubCardNew, pressed && styles.cardPressed]}
                    >
                      {club.visibilityMode === 'private' && (
                        <View style={styles.privateBadge}>
                          <Text style={styles.privateBadgeTxt}>🔒</Text>
                        </View>
                      )}
                      <View style={styles.clubCardLogoArea}>
                        {club.logoUrl ? (
                          <Image
                            source={{ uri: club.logoUrl }}
                            style={styles.clubCardLogoImg}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={styles.clubLogoFallback}>
                            {club.name.slice(0, 2).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.clubCardBody}>
                        <View style={styles.trainerNameRow}>
                          <Text style={styles.clubCardName} numberOfLines={1}>
                            {club.name}
                          </Text>
                          {club.avgRating && club.avgRating !== '0.00' && (
                            <Text style={styles.trainerRatingInline}>★ {club.avgRating}</Text>
                          )}
                        </View>
                        <Text style={styles.clubCardLocation} numberOfLines={1}>
                          {club.location ?? ''}
                        </Text>
                        {club.services.length > 0 && (
                          <Text style={styles.clubCardServices} numberOfLines={2}>
                            {club.services.slice(0, 4).join(' · ')}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.clubCardCtaBtn,
                        ctaDisabled && { opacity: 0.5 },
                        cta === 'book' && styles.clubCardCtaBtnBook,
                        cta === 'enter' && styles.clubCardCtaBtnEnter,
                      ]}
                      onPress={() => handleClubCta(club, cta)}
                      disabled={ctaDisabled}
                    >
                      <Text
                        style={[
                          styles.clubCardCtaBtnTxt,
                          cta === 'book' && { color: premium.accentGreen },
                          cta === 'enter' && { color: premium.accentBlue },
                        ]}
                      >
                        {ctaLabel(cta)}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </Animated.View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
              <Pressable
                onPress={() =>
                  (navigation as unknown as { navigate: (n: string) => void }).navigate('AllEvents')
                }
              >
                <Text style={styles.seeAllTxt}>Tümünü Gör →</Text>
              </Pressable>
            </View>
            <Text style={styles.sectionSubtitle}>
              Üye olmadan da incele, kontenjanı kapanmadan yerini ayır.
            </Text>
          </View>
        </View>

        {apiEvents.length > 0 && (
          <View style={styles.sliderViewport} pointerEvents="box-none">
            <Animated.View style={[styles.sliderTrack, { transform: [{ translateX: eventX }] }]}>
              {[...apiEvents, ...apiEvents].map((evt, idx) => {
                const eventDate = new Date(evt.startsAt);
                const dateStr = eventDate.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                });
                const timeStr = eventDate.toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <View key={`${evt.id}-${idx}`} style={styles.eventCardWrapper}>
                    <Pressable
                      onPress={() => setSelectedEvent(evt)}
                      style={({ pressed }) => [styles.eventCardApi, pressed && styles.cardPressed]}
                    >
                      {evt.imageUrl ? (
                        <Image
                          source={{ uri: evt.imageUrl }}
                          style={styles.eventCardApiImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.eventCardApiImagePlaceholder}>
                          <Text style={{ fontSize: 24 }}>📅</Text>
                        </View>
                      )}
                      <View style={styles.eventCardApiBody}>
                        <View style={styles.eventCardApiHeader}>
                          <Text style={styles.eventCardApiDate}>{dateStr}</Text>
                          <Text style={styles.eventCardApiTime}>{timeStr}</Text>
                        </View>
                        <Text style={styles.eventCardApiTitle} numberOfLines={2}>
                          {evt.title}
                        </Text>
                        {evt.coachName && (
                          <Text style={styles.eventCardApiCoach}>🏋️ {evt.coachName}</Text>
                        )}
                        {evt.clubName && (
                          <Text style={styles.eventCardApiClub}>{evt.clubName}</Text>
                        )}
                      </View>
                    </Pressable>
                    <Pressable style={styles.eventCardCtaBtn} onPress={() => setSelectedEvent(evt)}>
                      <Text style={styles.eventCardCtaBtnTxt}>📅 Detay & Katıl</Text>
                    </Pressable>
                  </View>
                );
              })}
            </Animated.View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Öne çıkan eğitmenler</Text>
              <Pressable
                onPress={() =>
                  (navigation as unknown as { navigate: (n: string) => void }).navigate(
                    'AllTrainers',
                  )
                }
              >
                <Text style={styles.seeAllTxt}>Tümünü Gör →</Text>
              </Pressable>
            </View>
            <Text style={styles.sectionSubtitle}>
              Sertifikalı, doğrulanmış ve kullanıcılar tarafından derecelendirilmiş.
            </Text>
          </View>
        </View>

        {apiTrainers.length > 0 && (
          <View style={styles.sliderViewport} pointerEvents="box-none">
            <Animated.View style={[styles.sliderTrack, { transform: [{ translateX: trainerX }] }]}>
              {[...apiTrainers, ...apiTrainers].map((trainer, idx) => (
                <View key={`${trainer.id}-${idx}`} style={styles.trainerCardWrapper}>
                  <Pressable
                    onPress={() => {
                      // Eğitmenin detay sayfasına git
                      (
                        navigation as unknown as { navigate: (n: string, p?: unknown) => void }
                      ).navigate('TrainerDetail', { trainerId: trainer.id });
                    }}
                    style={({ pressed }) => [styles.trainerCard, pressed && styles.cardPressed]}
                  >
                    {/* Rating badge */}
                    {/* Photo / Avatar area */}
                    <View style={styles.trainerPhotoArea}>
                      {trainer.photoUrl ? (
                        <Image
                          source={{ uri: trainer.photoUrl }}
                          style={styles.trainerPhotoImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.trainerAvatarTxt}>
                          {trainer.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </Text>
                      )}
                    </View>
                    {/* Info */}
                    <View style={styles.trainerInfoArea}>
                      <View style={styles.trainerNameRow}>
                        <Text style={styles.trainerName} numberOfLines={1}>
                          {trainer.name}
                        </Text>
                        {trainer.avgRating && trainer.avgRating !== '0.00' && (
                          <Text style={styles.trainerRatingInline}>★ {trainer.avgRating}</Text>
                        )}
                      </View>
                      <Text style={styles.trainerSpecLine} numberOfLines={1}>
                        {trainer.specialties.slice(0, 3).join(' · ')}
                      </Text>
                      <View style={styles.trainerMetaRow}>
                        <Text style={styles.trainerClub} numberOfLines={1}>
                          {trainer.clubName}
                        </Text>
                        {trainer.totalSessions > 0 && (
                          <Text style={styles.trainerSessionsTxt}>
                            {trainer.totalSessions} seans
                          </Text>
                        )}
                      </View>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.trainerCtaBtn}
                    onPress={() => {
                      void contactTrainer({
                        trainerId: trainer.id,
                        trainerUserId: trainer.userId,
                        trainerName: trainer.name,
                        clubName: trainer.clubName,
                        clubSubdomain: trainer.clubSubdomain,
                      });
                    }}
                  >
                    <Text style={styles.trainerCtaBtnTxt}>💬 İletişime Geç</Text>
                  </Pressable>
                </View>
              ))}
            </Animated.View>
          </View>
        )}

        {testimonial && (
          <Animated.View style={[styles.testimonialCard, { opacity: testimonialOpacity }]}>
            <Text style={styles.testimonialQuoteMark}>"</Text>
            <Text style={styles.testimonialQuote}>{testimonial.quote}</Text>
            <View style={styles.testimonialFooter}>
              <Text style={styles.testimonialAuthor}>{testimonial.author}</Text>
              <Text style={styles.testimonialMeta}>{testimonial.meta}</Text>
            </View>
          </Animated.View>
        )}

        <GlassCard style={styles.card}>
          {isAuthenticated ? (
            <>
              <View style={styles.membershipsHeader}>
                <Text style={styles.membershipsTitle}>🏢 Bağlı Kulüplerim</Text>
                <Text style={styles.membershipsHint}>
                  {myMemberships.length} kulüp · Başka bir kulübe de üye olabilirsiniz
                </Text>
              </View>
              {myMemberships.length === 0 ? (
                <Text style={styles.membershipsEmpty}>
                  Henüz bağlı kulübünüz yok. Aşağıdan bir kulüp keşfedin ve kaydolun.
                </Text>
              ) : (
                <View style={styles.membershipsList}>
                  {myMemberships.map((m) => (
                    <Pressable
                      key={m.membershipId}
                      style={({ pressed }) => [
                        styles.membershipRow,
                        m.isCurrent && styles.membershipRowCurrent,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() =>
                        setPreviewClub({
                          id: m.tenant.id,
                          name: m.tenant.name,
                          subdomain: m.tenant.subdomain,
                          logoUrl: m.tenant.logoUrl,
                        })
                      }
                    >
                      <View style={styles.membershipLogo}>
                        {m.tenant.logoUrl ? (
                          <Image
                            source={{ uri: m.tenant.logoUrl }}
                            style={styles.membershipLogoImg}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={styles.membershipLogoTxt}>
                            {m.tenant.name.slice(0, 2).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.membershipInfo}>
                        <View style={styles.membershipNameRow}>
                          <Text style={styles.membershipName} numberOfLines={1}>
                            {m.tenant.name}
                          </Text>
                          {m.isCurrent && (
                            <View style={styles.membershipBadge}>
                              <Text style={styles.membershipBadgeTxt}>AKTİF</Text>
                            </View>
                          )}
                        </View>
                        {m.tenant.location && (
                          <Text style={styles.membershipLoc} numberOfLines={1}>
                            📍 {m.tenant.location}
                          </Text>
                        )}
                        <Text style={styles.membershipStatus}>
                          {m.accountStatus === 'active'
                            ? '✓ Aktif üyelik'
                            : m.accountStatus === 'pending_approval'
                              ? '⏳ Onay bekliyor'
                              : m.accountStatus}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
              <Text style={styles.ctaChipsTitle}>Başka bir kulübe de kaydolun</Text>
              <Pressable
                onPress={() =>
                  navigation.navigate('Register', {
                    preselectedGoal: selectedGoal ?? undefined,
                  })
                }
                style={({ pressed }) => [styles.outlineBtn, pressed && styles.outlinePressed]}
              >
                <Text style={styles.outlineTxt}>+ Yeni Kulüp Kaydı</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.cardHint}>{t('registration.typeSubtitle')}</Text>

              <Pressable
                style={({ pressed }) => [styles.outlineBtn, pressed && styles.outlinePressed]}
                onPress={() => {
                  navigation.navigate('Login');
                }}
              >
                <Text style={styles.outlineTxt}>{t('onboarding.signIn')}</Text>
              </Pressable>

              <Text style={styles.ctaChipsTitle}>Veya farklı bir yolla başla</Text>
              <View style={styles.ctaChipsRow}>
                <Pressable
                  onPress={() =>
                    navigation.navigate('Register', {
                      preselectedGoal: selectedGoal ?? undefined,
                    })
                  }
                  style={({ pressed }) => [
                    styles.ctaChip,
                    styles.ctaChipDemo,
                    pressed && styles.ctaChipPressed,
                  ]}
                >
                  <Text style={styles.ctaChipIcon}>👤</Text>
                  <Text style={styles.ctaChipLabel}>Kullanıcı Başvurusu</Text>
                  <Text style={styles.ctaChipHint}>Üye olarak kayıt ol</Text>
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
              </View>
            </>
          )}
        </GlassCard>
      </ScrollView>
      <Modal
        visible={!!previewTrainer}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPreviewTrainer(null)}
      >
        <View
          style={[
            styles.modalBackdrop,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
          ]}
        >
          <Pressable style={styles.modalDismissArea} onPress={() => setPreviewTrainer(null)} />
          <View style={styles.modalSheet}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalCard}>
                <View
                  style={[
                    styles.modalAvatar,
                    previewTrainer ? { backgroundColor: previewTrainer.accentColor } : null,
                  ]}
                >
                  <Text style={styles.modalAvatarTxt}>{previewTrainer?.initials ?? ''}</Text>
                </View>
                <Text style={styles.modalTitle}>{previewTrainer?.name}</Text>
                <View style={styles.modalRatingRow}>
                  <Text style={styles.modalRating}>★ {previewTrainer?.ratingValue}</Text>
                  <Text style={styles.modalRatingMeta}>
                    · {previewTrainer?.reviewCount} değerlendirme
                  </Text>
                </View>
                <View style={styles.modalSpecRow}>
                  {(previewTrainer?.specialties ?? []).map((spec) => (
                    <View key={spec} style={styles.modalSpecChip}>
                      <Text style={styles.modalSpecTxt}>{spec}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.modalClubRow}>
                  <Text style={styles.modalClubLabel}>Kulüp:</Text>
                  <Text style={styles.modalClubName}>{previewTrainer?.clubName}</Text>
                </View>
                <Text style={styles.modalBio}>{previewTrainer?.bio}</Text>
                <View style={styles.modalPriceCard}>
                  <Text style={styles.modalPriceLabel}>Tahmini özel ders ücreti</Text>
                  <Text style={styles.modalPriceValue}>{previewTrainer?.pricePerSession}</Text>
                  <Text style={styles.modalPriceHint}>
                    seans başı · kulüp paketine göre değişebilir
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalPrimaryBtn,
                    styles.modalPrimaryBtnLesson,
                    pressed && styles.modalPrimaryPressed,
                  ]}
                  onPress={() => {
                    const trainer = previewTrainer;
                    if (!trainer) return;
                    setPreviewTrainer(null);
                    void contactTrainer({
                      trainerId: trainer.id,
                      trainerName: trainer.name,
                      clubName: trainer.clubName,
                      clubSubdomain: trainer.clubSubdomain,
                    });
                  }}
                >
                  <Text style={styles.modalPrimaryLessonTxt}>💬 İletişime Geç</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalSecondaryBtn,
                    pressed && styles.modalSecondaryPressed,
                  ]}
                  onPress={() => {
                    const trainer = previewTrainer;
                    if (!trainer) return;
                    setPreviewTrainer(null);
                    const directoryMatch = tenantDirectory.find(
                      (row) => row.subdomain === trainer.clubSubdomain,
                    );
                    setPreviewClub(
                      directoryMatch ?? {
                        id: trainer.clubSubdomain,
                        name: trainer.clubName,
                        subdomain: trainer.clubSubdomain,
                        logoUrl: null,
                      },
                    );
                  }}
                >
                  <Text style={styles.modalSecondaryTxt}>Kulübü incele</Text>
                </Pressable>
                <Pressable
                  style={styles.modalCloseBtn}
                  onPress={() => setPreviewTrainer(null)}
                  hitSlop={6}
                >
                  <Text style={styles.modalCloseTxt}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                    const club = previewClub;
                    setPreviewClub(null);
                    if (!club) return;
                    void contactClub({
                      clubSubdomain: club.subdomain,
                      clubName: club.name,
                      clubId: club.id,
                    });
                  }}
                >
                  <Text style={styles.modalPrimaryTxt}>💬 İletişime Geç</Text>
                </Pressable>
                <Pressable
                  style={styles.modalSecondaryBtn}
                  onPress={() => {
                    const subdomain = previewClub?.subdomain;
                    setPreviewClub(null);
                    navigation.navigate('Register', {
                      preselectedSubdomain: subdomain,
                      preselectedGoal: selectedGoal ?? undefined,
                    });
                  }}
                >
                  <Text style={styles.modalSecondaryTxt}>Üye Ol</Text>
                </Pressable>
                <Pressable style={styles.modalSecondaryBtn} onPress={() => setPreviewClub(null)}>
                  <Text style={styles.modalSecondaryTxt}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <LeadCaptureModal
        visible={leadModal.visible}
        onClose={() => setLeadModal((prev) => ({ ...prev, visible: false }))}
        source={leadModal.source}
        sourceRef={leadModal.sourceRef}
        sourceLabel={leadModal.sourceLabel}
        clubSubdomain={leadModal.clubSubdomain}
        prefillMessage={leadModal.prefillMessage}
      />

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isAuthenticated={isAuthenticated}
        onRegister={() => {
          setSelectedEvent(null);
          navigation.navigate('Register');
        }}
        onLogin={() => {
          setSelectedEvent(null);
          navigation.navigate('Login');
        }}
        onJoin={(eventId) => {
          const evt = apiEvents.find((e) => e.id === eventId);
          if (evt) {
            void joinEventAction(evt);
          } else {
            setSelectedEvent(null);
          }
        }}
      />

      <CampaignDetailModal
        campaign={
          previewCampaign
            ? {
                id: previewCampaign.id,
                title: previewCampaign.title,
                description: previewCampaign.description,
                imageUrl: previewCampaign.imageUrl,
                campaignType: previewCampaign.campaignType,
                discountKind: previewCampaign.discountKind,
                discountValue: previewCampaign.discountValue,
                originalPrice: previewCampaign.originalPrice,
                discountedPrice: previewCampaign.discountedPrice,
                terms: previewCampaign.terms,
                startsAt: previewCampaign.startsAt,
                endsAt: previewCampaign.endsAt,
                clubName: previewCampaign.tenant?.name ?? null,
              }
            : null
        }
        onClose={() => setPreviewCampaign(null)}
      />

      <JoinRequestModal
        visible={!!joinRequestTarget}
        club={joinRequestTarget}
        token={token}
        tenantSubdomain={tenant?.subdomain ?? null}
        onClose={() => setJoinRequestTarget(null)}
        onSuccess={() => {
          // Reload memberships so pending state shows up immediately
          if (token && tenant) {
            apiJson<typeof myMemberships>('/auth/my-memberships', {
              token,
              tenantSubdomain: tenant.subdomain,
            })
              .then((rows) => setMyMemberships(rows))
              .catch(() => {});
          }
        }}
      />
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
  goalsDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusMd,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  goalsDropdownBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  goalsDropdownBtnActive: {
    borderColor: 'rgba(56,189,248,0.4)',
    backgroundColor: 'rgba(56,189,248,0.06)',
  },
  goalsDropdownIcon: {
    fontSize: 22,
  },
  goalsDropdownTextWrap: {
    flex: 1,
  },
  goalsDropdownArrow: {
    color: premium.textMuted,
    fontSize: 12,
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
  catChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    backgroundColor: 'rgba(148,163,184,0.04)',
  },
  catChipActive: {
    borderColor: 'rgba(56,189,248,0.4)',
    backgroundColor: 'rgba(56,189,248,0.1)',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: premium.textMuted,
  },
  catChipTextActive: {
    color: premium.accentBlue,
  },
  popSearches: {
    marginTop: 14,
  },
  popSearchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: premium.textMuted,
    marginBottom: 8,
  },
  popSearchRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
  },
  popSearchChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(56,189,248,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.15)',
  },
  popSearchChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: premium.accentBlue,
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
  clubLogoFallback: {
    color: premium.accentBlue,
    fontSize: 24,
    fontWeight: '800',
  },
  clubServices: {
    color: premium.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllTxt: {
    fontSize: 13,
    color: premium.accentBlue,
    fontWeight: '700',
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
    height: 200,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(8,16,28,0.7)',
    overflow: 'hidden',
    position: 'relative',
  },
  trainerCardWrapper: {
    width: TRAINER_CARD_WIDTH,
    gap: 8,
  },
  trainerPhotoArea: {
    width: '100%',
    height: 100,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trainerPhotoImg: {
    width: '100%',
    height: 160,
    position: 'absolute',
    top: 0,
  },
  trainerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  trainerAvatarTxt: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  trainerInfoArea: {
    flex: 1,
    padding: 12,
    gap: 3,
    justifyContent: 'center',
  },
  trainerName: {
    color: premium.text,
    fontSize: 14,
    fontWeight: '800',
  },
  trainerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trainerRatingInline: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '900',
  },
  trainerSpecLine: {
    color: premium.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  trainerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  trainerClub: {
    color: premium.accentBlue,
    fontSize: 10,
    fontWeight: '700',
  },
  trainerSessionsTxt: {
    color: premium.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  trainerRatingRow: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  trainerRatingValue: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '900',
  },
  trainerCtaBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    backgroundColor: 'rgba(34,197,94,0.06)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  trainerCtaBtnTxt: {
    color: premium.accentGreen,
    fontSize: 12,
    fontWeight: '800',
  },
  trainerRatingMeta: {
    color: premium.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },
  trainerSessionsBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  trainerCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.55)',
    backgroundColor: 'rgba(34,197,94,0.16)',
  },
  trainerCtaPillIcon: {
    fontSize: 11,
  },
  trainerCtaPillTxt: {
    color: premium.accentGreen,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  trainerScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 8,
  },
  clubCardNew: {
    width: TRAINER_CARD_WIDTH,
    height: 200,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(8,16,28,0.85)',
    overflow: 'hidden',
    position: 'relative',
  },
  privateBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
  },
  privateBadgeTxt: {
    fontSize: 12,
  },
  clubCardWrapper: {
    width: TRAINER_CARD_WIDTH,
    gap: 8,
  },
  clubCardLogoArea: {
    width: '100%',
    height: 90,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  clubCardLogoImg: {
    width: '90%',
    height: '80%',
  },
  clubCardBody: {
    padding: 12,
    gap: 4,
  },
  clubCardName: {
    color: premium.text,
    fontSize: 14,
    fontWeight: '800',
  },
  clubCardLocation: {
    color: premium.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  clubCardServices: {
    color: premium.textMuted,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 13,
  },
  clubCardRating: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  clubCardCtaBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    backgroundColor: 'rgba(251,191,36,0.08)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  clubCardCtaBtnBook: {
    borderColor: 'rgba(52,211,153,0.4)',
    backgroundColor: 'rgba(52,211,153,0.08)',
  },
  clubCardCtaBtnEnter: {
    borderColor: 'rgba(56,189,248,0.4)',
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  clubCardCtaBtnTxt: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
  },
  clubCardCtas: {
    gap: 6,
    marginTop: 4,
  },
  clubCardCtaJoin: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.5)',
    backgroundColor: 'rgba(251,191,36,0.12)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  clubCardCtaJoinTxt: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
  },
  eventCardWrapper: {
    width: TRAINER_CARD_WIDTH,
    gap: 8,
  },
  eventCardApi: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(8,16,28,0.7)',
    overflow: 'hidden',
  },
  eventCardCtaBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    backgroundColor: 'rgba(56,189,248,0.06)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  eventCardCtaBtnTxt: {
    color: premium.accentBlue,
    fontSize: 12,
    fontWeight: '800',
  },
  eventCardApiClub: {
    color: premium.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  eventCardApiImage: {
    width: '100%',
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  eventCardApiImagePlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCardApiBody: {
    padding: 12,
    gap: 6,
  },
  eventCardApiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventCardApiDate: {
    color: premium.accentBlue,
    fontSize: 11,
    fontWeight: '800',
  },
  eventCardApiTime: {
    color: premium.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  eventCardApiTitle: {
    color: premium.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  eventCardApiCoach: {
    color: premium.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  modalRatingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 6,
  },
  modalRating: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '900',
  },
  modalRatingMeta: {
    color: premium.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  modalSpecRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 12,
  },
  modalSpecChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalSpecTxt: {
    color: premium.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalClubRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    alignItems: 'baseline',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  modalClubLabel: {
    color: premium.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  modalClubName: {
    color: premium.accentBlue,
    fontSize: 13,
    fontWeight: '800',
  },
  modalBio: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: premium.text,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalPriceCard: {
    width: '100%',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.45)',
    backgroundColor: 'rgba(34,197,94,0.08)',
    alignItems: 'center',
  },
  modalPriceLabel: {
    color: premium.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  modalPriceValue: {
    color: premium.accentGreen,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  modalPriceHint: {
    color: premium.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  modalPrimaryBtnLesson: {
    marginTop: 14,
    backgroundColor: 'rgba(34,197,94,0.32)',
    borderColor: 'rgba(34,197,94,0.6)',
  },
  modalPrimaryLessonTxt: {
    color: premium.accentGreen,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  modalPrimaryPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalSecondaryPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modalCloseBtn: {
    marginTop: 6,
    paddingVertical: 6,
    alignSelf: 'center',
  },
  modalCloseTxt: {
    color: premium.textMuted,
    fontSize: 12,
    fontWeight: '700',
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
  // ─── Bağlı Kulüplerim ──────────────────────────────────
  membershipsHeader: {
    marginBottom: 12,
  },
  membershipsTitle: {
    color: premium.text,
    fontSize: 17,
    fontWeight: '800',
  },
  membershipsHint: {
    color: premium.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  membershipsEmpty: {
    color: premium.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 14,
    lineHeight: 19,
  },
  membershipsList: {
    gap: 8,
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  membershipRowCurrent: {
    borderColor: 'rgba(56,189,248,0.4)',
    backgroundColor: 'rgba(56,189,248,0.06)',
  },
  membershipLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  membershipLogoImg: { width: '100%', height: '100%' },
  membershipLogoTxt: {
    color: premium.accentBlue,
    fontSize: 14,
    fontWeight: '800',
  },
  membershipInfo: { flex: 1 },
  membershipNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  membershipName: {
    color: premium.text,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  membershipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(56,189,248,0.15)',
  },
  membershipBadgeTxt: {
    color: premium.accentBlue,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  membershipLoc: {
    color: premium.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  membershipStatus: {
    color: premium.accentGreen,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
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
  modalContactBtn: {
    width: '100%',
    minHeight: 44,
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
    backgroundColor: 'rgba(56,189,248,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalContactBtnTxt: {
    color: premium.accentBlue,
    fontSize: 15,
    fontWeight: '700',
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
  // ─── Kampanyalar ───────────────────────────────────────────────────────────
  campaignSection: {
    marginTop: 24,
    marginBottom: 8,
  },
  campaignSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  campaignSectionEmoji: {
    fontSize: 22,
  },
  campaignSectionTextWrap: {
    flex: 1,
  },
  campaignScrollInner: {
    paddingHorizontal: 20,
    gap: 12,
  },
  campaignCard: {
    width: SLIDER_CARD_WIDTH,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    backgroundColor: 'rgba(251,191,36,0.06)',
    overflow: 'hidden',
  },
  campaignCardPressed: {
    opacity: 0.85,
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  campaignCardCover: {
    height: 80,
    backgroundColor: 'rgba(251,191,36,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  campaignCardCoverEmoji: {
    fontSize: 32,
  },
  campaignBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(251,191,36,0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  campaignBadgeTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
  },
  campaignCardBody: {
    padding: 12,
    gap: 4,
  },
  campaignCardImage: {
    width: '100%',
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  campaignDiscountBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  campaignDiscountTxt: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
  },
  campaignPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10b981',
  },
  campaignTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: premium.text,
    lineHeight: 17,
    marginTop: 4,
  },
  campaignClub: {
    fontSize: 10,
    color: premium.textMuted,
    marginTop: 2,
  },
  campaignCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: premium.text,
    lineHeight: 19,
  },
  campaignCardClub: {
    fontSize: 12,
    color: premium.textMuted,
    fontWeight: '600',
  },
  campaignCardUrgent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f87171',
    marginTop: 2,
  },
  campaignPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  campaignOldPrice: {
    fontSize: 12,
    color: premium.textMuted,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  campaignNewPrice: {
    fontSize: 14,
    color: '#34d399',
    fontWeight: '800',
  },
  campaignCardQuota: {
    fontSize: 11,
    color: premium.textMuted,
    fontWeight: '600',
  },
  // ─── Kampanya Modal ────────────────────────────────────────────────────────
  campaignModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  campaignModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    backgroundColor: 'rgba(5,16,28,0.97)',
    padding: 24,
    alignItems: 'center',
  },
  campaignModalHeader: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  campaignModalEmoji: {
    fontSize: 44,
  },
  campaignModalBadgeLg: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.5)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  campaignModalBadgeLgTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fbbf24',
  },
  campaignModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: premium.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  campaignModalDesc: {
    fontSize: 14,
    color: premium.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  campaignModalPriceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  campaignModalOldPrice: {
    fontSize: 18,
    color: premium.textMuted,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  campaignModalNewPrice: {
    fontSize: 24,
    color: '#34d399',
    fontWeight: '900',
  },
  campaignModalTerms: {
    fontSize: 12,
    color: premium.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  campaignModalClubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  campaignModalClubIcon: {
    fontSize: 16,
  },
  campaignModalClubName: {
    fontSize: 14,
    fontWeight: '700',
    color: premium.text,
  },
  campaignModalDates: {
    marginBottom: 16,
  },
  campaignModalDateTxt: {
    fontSize: 13,
    color: premium.textMuted,
    fontWeight: '600',
  },
  campaignModalCta: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.1)',
    marginBottom: 10,
  },
  campaignModalCtaPressed: {
    backgroundColor: 'rgba(251,191,36,0.25)',
  },
  campaignModalCtaTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fbbf24',
  },
  campaignModalClose: {
    paddingVertical: 8,
  },
  campaignModalCloseTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: premium.textMuted,
  },
});
