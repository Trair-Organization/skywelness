import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { premium } from '../../theme/premiumTheme';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
};

export function PremiumInput({ label, error, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="rgba(244,247,251,0.35)"
        {...rest}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputErr : null,
          style,
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: premium.space.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: premium.textMuted,
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    fontSize: 16,
    color: premium.text,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  inputFocused: {
    borderColor: 'rgba(56,189,248,0.65)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  inputErr: {
    borderColor: 'rgba(248,113,113,0.7)',
  },
  err: {
    marginTop: 6,
    fontSize: 12,
    color: premium.danger,
  },
});
