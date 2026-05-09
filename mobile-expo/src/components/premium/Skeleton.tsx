import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { premium } from '../../theme/premiumTheme';

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/** Shimmer efektli placeholder. */
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.base, { width: width as number, height, borderRadius, opacity }, style]}
    />
  );
}

/** Kart şeklinde skeleton — GlassCard benzeri. */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width="40%" height={12} />
      <Skeleton width="100%" height={18} style={{ marginTop: 10 }} />
      <Skeleton width="70%" height={14} style={{ marginTop: 8 }} />
      <Skeleton width="50%" height={14} style={{ marginTop: 6 }} />
    </View>
  );
}

/** Yatay kart listesi için skeleton. */
export function SkeletonHorizontalCards({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.horizontalRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.horizontalCard}>
          <Skeleton width="100%" height={100} borderRadius={12} />
          <Skeleton width="80%" height={12} style={{ marginTop: 10 }} />
          <Skeleton width="60%" height={10} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

/** Hero bölümü için skeleton. */
export function SkeletonHero() {
  return (
    <View style={styles.hero}>
      <Skeleton width="60%" height={22} />
      <Skeleton width="90%" height={16} style={{ marginTop: 12 }} />
      <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
      <View style={styles.heroStats}>
        <Skeleton width={80} height={50} borderRadius={12} />
        <Skeleton width={80} height={50} borderRadius={12} />
        <Skeleton width={80} height={50} borderRadius={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: premium.glass,
  },
  card: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusMd,
    backgroundColor: premium.glass,
    padding: 16,
    marginBottom: 12,
  },
  horizontalRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },
  horizontalCard: {
    width: 160,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusMd,
    backgroundColor: premium.glass,
    padding: 12,
  },
  hero: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});
