import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { GradientBackground } from './GradientBackground';

const logoLight = require('../../../assets/branding/wellness-club-logo-header.png');

export function AnimatedSplash() {
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const haloRotate = useRef(new Animated.Value(0)).current;
  const haloRotateRev = useRef(new Animated.Value(0)).current;
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(24)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(18)).current;
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  const dot3 = useRef(new Animated.Value(0.25)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 520,
        delay: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleY, {
        toValue: 0,
        duration: 620,
        delay: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 520,
        delay: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleY, {
        toValue: 0,
        duration: 620,
        delay: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    floatLoop.start();

    const haloLoop = Animated.loop(
      Animated.timing(haloRotate, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    haloLoop.start();

    const haloRevLoop = Animated.loop(
      Animated.timing(haloRotateRev, {
        toValue: 1,
        duration: 13000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    haloRevLoop.start();

    const buildPulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
    const p1 = buildPulse(pulse1, 0);
    const p2 = buildPulse(pulse2, 800);
    const p3 = buildPulse(pulse3, 1600);
    p1.start();
    p2.start();
    p3.start();

    const buildDot = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.25,
            duration: 360,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(720),
        ]),
      );
    const d1 = buildDot(dot1, 1500);
    const d2 = buildDot(dot2, 1700);
    const d3 = buildDot(dot3, 1900);
    d1.start();
    d2.start();
    d3.start();

    const progressLoop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    );
    progressLoop.start();

    return () => {
      floatLoop.stop();
      haloLoop.stop();
      haloRevLoop.stop();
      p1.stop();
      p2.stop();
      p3.stop();
      d1.stop();
      d2.stop();
      d3.stop();
      progressLoop.stop();
    };
  }, [
    logoScale,
    logoOpacity,
    logoFloat,
    haloRotate,
    haloRotateRev,
    pulse1,
    pulse2,
    pulse3,
    titleOpacity,
    titleY,
    subtitleOpacity,
    subtitleY,
    dot1,
    dot2,
    dot3,
    progress,
  ]);

  const haloDeg = haloRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const haloDegRev = haloRotateRev.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });
  const floatY = logoFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const pulseStyle = (val: Animated.Value) => ({
    opacity: val.interpolate({
      inputRange: [0, 0.08, 1],
      outputRange: [0, 0.55, 0],
    }),
    transform: [
      {
        scale: val.interpolate({
          inputRange: [0, 1],
          outputRange: [0.55, 1.85],
        }),
      },
    ],
  });

  const progressWidth = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0%', '85%', '100%'],
  });

  return (
    <GradientBackground>
      <View style={styles.center}>
        <View style={styles.logoStack}>
          <Animated.View pointerEvents="none" style={[styles.pulseRing, pulseStyle(pulse1)]} />
          <Animated.View pointerEvents="none" style={[styles.pulseRing, pulseStyle(pulse2)]} />
          <Animated.View pointerEvents="none" style={[styles.pulseRing, pulseStyle(pulse3)]} />

          <View pointerEvents="none" style={styles.softGlow} />

          <Animated.View
            pointerEvents="none"
            style={[styles.haloOuter, { transform: [{ rotate: haloDeg }] }]}
          >
            <View style={styles.haloDotPrimary} />
            <View style={styles.haloDotAccentRight} />
            <View style={styles.haloDotAccentBottom} />
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[styles.haloInner, { transform: [{ rotate: haloDegRev }] }]}
          >
            <View style={styles.haloDotInnerTop} />
            <View style={styles.haloDotInnerLeft} />
          </Animated.View>

          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: floatY }],
            }}
          >
            <Image source={logoLight} style={styles.logo} />
          </Animated.View>
        </View>

        <Animated.Text
          style={[styles.title, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}
        >
          Wellness Club
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            { opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] },
          ]}
        >
          Exclusive Fitness & Wellness Ecosystem
        </Animated.Text>

        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dot1 }]} />
          <Animated.View style={[styles.dot, { opacity: dot2 }]} />
          <Animated.View style={[styles.dot, { opacity: dot3 }]} />
        </View>

        <View style={styles.progressWrap}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      </View>
    </GradientBackground>
  );
}

const LOGO_SIZE = 96;
const HALO_OUTER = 168;
const HALO_INNER = 132;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 32,
  },
  logoStack: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(56,189,248,0.85)',
  },
  softGlow: {
    position: 'absolute',
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: 'rgba(56,189,248,0.18)',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  haloOuter: {
    position: 'absolute',
    width: HALO_OUTER,
    height: HALO_OUTER,
  },
  haloDotPrimary: {
    position: 'absolute',
    top: -3,
    left: HALO_OUTER / 2 - 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  haloDotAccentRight: {
    position: 'absolute',
    top: HALO_OUTER / 2 - 3,
    right: -2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(56,189,248,0.65)',
  },
  haloDotAccentBottom: {
    position: 'absolute',
    bottom: 6,
    left: HALO_OUTER * 0.3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(56,189,248,0.45)',
  },
  haloInner: {
    position: 'absolute',
    width: HALO_INNER,
    height: HALO_INNER,
  },
  haloDotInnerTop: {
    position: 'absolute',
    top: HALO_INNER * 0.18,
    right: HALO_INNER * 0.16,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(167,188,214,0.85)',
  },
  haloDotInnerLeft: {
    position: 'absolute',
    bottom: HALO_INNER * 0.12,
    left: HALO_INNER * 0.18,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(167,188,214,0.55)',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 24,
  },
  title: {
    color: '#e6f3ff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  subtitle: {
    color: '#a7bcd6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38bdf8',
  },
  progressWrap: {
    width: 120,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(56,189,248,0.85)',
    borderRadius: 1,
  },
});
