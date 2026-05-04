import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  View,
} from 'react-native';
import { premium } from '../../theme/premiumTheme';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  rightSlot?: ReactNode;
  inputWrapStyle?: ViewStyle;
  containerStyle?: StyleProp<ViewStyle>;
};

export function PremiumInput({
  label,
  error,
  style,
  onFocus,
  onBlur,
  rightSlot,
  inputWrapStyle,
  containerStyle,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputFocused,
          error ? styles.inputErr : null,
          inputWrapStyle,
        ]}
      >
        <TextInput
          placeholderTextColor="rgba(244,247,251,0.35)"
          {...rest}
          style={[styles.input, rightSlot ? styles.inputWithRight : null, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>
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
  inputWrap: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    backgroundColor: 'rgba(0,0,0,0.25)',
    minHeight: Platform.OS === 'ios' ? 56 : 52,
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    fontSize: 16,
    color: premium.text,
  },
  inputFocused: {
    borderColor: 'rgba(56,189,248,0.65)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  inputWithRight: {
    paddingRight: 74,
  },
  rightSlot: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
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
