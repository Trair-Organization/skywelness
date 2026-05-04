import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { premium } from '../../theme/premiumTheme';

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
});
