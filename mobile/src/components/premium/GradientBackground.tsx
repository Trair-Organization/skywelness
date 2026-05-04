import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { premium } from '../../theme/premiumTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type StarDef = {
  key: string;
  x: number;
  size: number;
  opacity: number;
  durationMs: number;
  delayMs: number;
};

function StarLane({ star }: { star: StarDef }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(star.delayMs),
        Animated.timing(progress, {
          toValue: 1,
          duration: star.durationMs,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [progress, star.delayMs, star.durationMs]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, SCREEN_HEIGHT + 60],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [0.55, 1, 1.35],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.star,
        {
          left: star.x,
          width: star.size,
          height: star.size,
          opacity: star.opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    />
  );
}

function Starfield() {
  const stars = useMemo<StarDef[]>(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        key: `star-${i}`,
        x: 12 + ((i * 37) % Math.max(24, Math.floor(SCREEN_WIDTH) - 24)),
        size: i % 5 === 0 ? 2.8 : i % 3 === 0 ? 2.2 : 1.6,
        opacity: i % 4 === 0 ? 0.9 : 0.65,
        durationMs: 4200 + (i % 7) * 520,
        delayMs: (i % 9) * 260,
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.starfield}>
      {stars.map((star) => (
        <StarLane key={star.key} star={star} />
      ))}
    </View>
  );
}

export function GradientBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0c1228', '#071018', '#04120f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(37,99,235,0.35)', 'transparent', 'rgba(16,185,129,0.25)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Starfield />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: premium.bg0,
  },
  content: {
    flex: 1,
  },
  starfield: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    top: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 238, 255, 0.95)',
    shadowColor: '#9dd7ff',
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
});
