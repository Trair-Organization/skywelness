import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientButton, premium } from '../../theme/premiumTheme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function GlowButton({ label, onPress, disabled, loading }: Props) {
  const dim = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={dim}
      style={({ pressed }) => [styles.wrap, dim && styles.dim, pressed && !dim && styles.pressed]}
    >
      <LinearGradient
        colors={[...gradientButton.colors]}
        start={gradientButton.start}
        end={gradientButton.end}
        style={styles.gradient}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.label}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: premium.radiusMd,
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#22d3ee',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  dim: {
    opacity: 0.72,
  },
  gradient: {
    borderRadius: premium.radiusMd,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    backgroundColor: 'rgba(14,116,144,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  label: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
