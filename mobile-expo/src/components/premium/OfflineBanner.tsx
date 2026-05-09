import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { premium } from '../../theme/premiumTheme';

/**
 * Basit bir polling-based connectivity check.
 * React Native'in NetInfo kütüphanesi olmadan çalışır.
 * Her 5 saniyede bir production API'ye HEAD isteği atar.
 */
function useOnlineStatus(intervalMs = 5000): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        await fetch('https://www.wellnessclub.tech/api/v1/health/live', {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };

    check();
    const id = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return online;
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  const height = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!online) {
      setVisible(true);
      Animated.timing(height, { toValue: 36, duration: 250, useNativeDriver: false }).start();
    } else {
      Animated.timing(height, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
        setVisible(false);
      });
    }
  }, [online, height]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, { height }]}>
      <View style={styles.inner}>
        <Text style={styles.icon}>📡</Text>
        <Text style={styles.text}>Çevrimdışısınız — bağlantı bekleniyor</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(248,113,113,0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(248,113,113,0.4)',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  icon: { fontSize: 14 },
  text: {
    color: premium.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
