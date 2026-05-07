import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/premium/GradientBackground';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export function MemberEntryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('Register'), 0);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <GradientBackground>
      <View style={[styles.redirectWrap, { paddingTop: insets.top + 20 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.navigate('RegistrationType')}>
          <Text style={styles.backTxt}>{t('common.back')}</Text>
        </Pressable>
        <View style={styles.loaderBox}>
          <ActivityIndicator color={premium.accentBlue} />
          <Text style={styles.redirectTxt}>{t('registration.memberTitle')}</Text>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  redirectWrap: {
    flex: 1,
    paddingHorizontal: 22,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  backTxt: {
    color: premium.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  loaderBox: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusSm,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  redirectTxt: { color: premium.textMuted, fontSize: 14, fontWeight: '600' },
});
