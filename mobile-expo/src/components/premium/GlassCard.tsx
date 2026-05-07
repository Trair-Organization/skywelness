import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { premium } from '../../theme/premiumTheme';

export function GlassCard({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: premium.glass,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusLg,
    padding: premium.space.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
});
