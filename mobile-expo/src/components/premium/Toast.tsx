import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { premium } from '../../theme/premiumTheme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
};

let globalShow: ((message: string, type?: ToastType, duration?: number) => void) | null = null;

/** Herhangi bir yerden toast göstermek için kullan. */
export function showToast(message: string, type: ToastType = 'info', duration = 3000) {
  globalShow?.(message, type, duration);
}

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'rgba(16,185,129,0.15)',
    border: 'rgba(52,211,153,0.5)',
    icon: '✓',
  },
  error: {
    bg: 'rgba(248,113,113,0.15)',
    border: 'rgba(248,113,113,0.5)',
    icon: '✕',
  },
  warning: {
    bg: 'rgba(251,191,36,0.15)',
    border: 'rgba(251,191,36,0.5)',
    icon: '⚠',
  },
  info: {
    bg: 'rgba(56,189,248,0.15)',
    border: 'rgba(56,189,248,0.5)',
    icon: 'ℹ',
  },
};

function ToastItemView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const colors = COLORS[item.type];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, item.duration);

    return () => clearTimeout(timer);
  }, [item.duration, onDismiss, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Text style={styles.icon}>{colors.icon}</Text>
      <Text style={styles.message} numberOfLines={3}>
        {item.message}
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Text style={styles.dismiss}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, type, duration }]);
  }, []);

  useEffect(() => {
    globalShow = show;
    return () => {
      globalShow = null;
    };
  }, [show]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <View style={styles.root}>
      {children}
      <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
        {toasts.map((item) => (
          <ToastItemView key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: premium.radiusMd,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    width: '100%',
    maxWidth: 400,
    gap: 10,
  },
  icon: {
    fontSize: 16,
    fontWeight: '800',
    color: premium.text,
  },
  message: {
    flex: 1,
    color: premium.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  dismiss: {
    color: premium.textMuted,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
});
