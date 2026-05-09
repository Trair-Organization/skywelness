import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { premium } from '../../theme/premiumTheme';

type EmptyStateProps = {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
};

/**
 * Boş liste/veri durumlarında gösterilen bilgilendirme component'i.
 * İkon + başlık + açıklama + opsiyonel CTA butonu.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onAction}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    color: premium.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  button: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(56,189,248,0.1)',
  },
  buttonPressed: {
    backgroundColor: 'rgba(56,189,248,0.2)',
  },
  buttonText: {
    color: premium.accentBlue,
    fontSize: 14,
    fontWeight: '700',
  },
});
