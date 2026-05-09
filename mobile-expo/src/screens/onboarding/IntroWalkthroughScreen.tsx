import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradientBackground } from '../../components/premium/GradientBackground';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const INTRO_SEEN_KEY = '@wellness_intro_seen';

type Slide = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  accent: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '🏋️',
    title: 'Kulübünü Bul',
    description: 'Yakınındaki fitness kulüplerini keşfet, sana en uygun olanı seç ve hemen üye ol.',
    accent: '#38bdf8',
  },
  {
    id: '2',
    emoji: '📅',
    title: 'Kolayca Rezervasyon Yap',
    description:
      'Eğitmenini seç, uygun saati bul ve tek dokunuşla seansını planla. Hatırlatmalar otomatik.',
    accent: '#34d399',
  },
  {
    id: '3',
    emoji: '🚀',
    title: 'Hedefine Ulaş',
    description:
      "Paketlerini takip et, etkinliklere katıl, SkyCafe'den sipariş ver — her şey tek uygulamada.",
    accent: '#fbbf24',
  },
];

type Nav = NativeStackNavigationProp<RootStackParamList, 'Intro'>;

export async function hasSeenIntro(): Promise<boolean> {
  const val = await AsyncStorage.getItem(INTRO_SEEN_KEY);
  return val === 'true';
}

export async function markIntroSeen(): Promise<void> {
  await AsyncStorage.setItem(INTRO_SEEN_KEY, 'true');
}

export function IntroWalkthroughScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      markIntroSeen().catch(() => {});
      navigation.reset({ index: 0, routes: [{ name: 'ClubConnect' }] });
    }
  }, [currentIndex, navigation]);

  const handleSkip = useCallback(() => {
    markIntroSeen().catch(() => {});
    navigation.reset({ index: 0, routes: [{ name: 'ClubConnect' }] });
  }, [navigation]);

  const renderItem = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View
        style={[
          styles.emojiCircle,
          { borderColor: item.accent + '60', backgroundColor: item.accent + '15' },
        ]}
      >
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDesc}>{item.description}</Text>
    </View>
  );

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <GradientBackground>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Skip button */}
        {!isLast && (
          <Pressable style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipTxt}>Atla</Text>
          </Pressable>
        )}

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: false,
          })}
          scrollEventThrottle={16}
          style={styles.flatList}
        />

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((slide, i) => {
            const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={slide.id}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity: dotOpacity, backgroundColor: slide.accent },
                ]}
              />
            );
          })}
        </View>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
          onPress={handleNext}
        >
          <Text style={styles.ctaTxt}>{isLast ? 'Başla' : 'Devam'}</Text>
          <Text style={styles.ctaArrow}>{isLast ? '🚀' : '→'}</Text>
        </Pressable>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipTxt: { color: premium.textMuted, fontSize: 15, fontWeight: '600' },
  flatList: { flex: 1 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emojiCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  emoji: { fontSize: 52 },
  slideTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: premium.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  slideDesc: {
    fontSize: 16,
    color: premium.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: premium.accentBlue,
    borderRadius: premium.radiusSm,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(56,189,248,0.1)',
    marginBottom: 12,
  },
  ctaBtnPressed: { backgroundColor: 'rgba(56,189,248,0.25)' },
  ctaTxt: { color: premium.accentBlue, fontSize: 18, fontWeight: '700' },
  ctaArrow: { fontSize: 18 },
});
