import { StyleSheet, Text, View } from 'react-native';
import { premium } from '../../theme/premiumTheme';

type StepIndicatorProps = {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
};

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const active = i <= currentStep;
          const current = i === currentStep;
          return (
            <View key={i} style={styles.dotWrap}>
              <View
                style={[styles.dot, active && styles.dotActive, current && styles.dotCurrent]}
              />
              {i < totalSteps - 1 && <View style={[styles.line, active && styles.lineActive]} />}
            </View>
          );
        })}
      </View>
      {labels && labels[currentStep] ? (
        <Text style={styles.label}>{labels[currentStep]}</Text>
      ) : null}
      <Text style={styles.counter}>
        {currentStep + 1} / {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  dotActive: {
    backgroundColor: premium.accentBlue,
    borderColor: premium.accentBlue,
  },
  dotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.3)',
  },
  line: {
    width: 28,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
  },
  lineActive: {
    backgroundColor: premium.accentBlue,
  },
  label: {
    marginTop: 10,
    color: premium.text,
    fontSize: 14,
    fontWeight: '700',
  },
  counter: {
    marginTop: 4,
    color: premium.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
