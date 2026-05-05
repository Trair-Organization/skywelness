import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import type { RootStackParamList } from '../../navigation/types';
import { premium } from '../../theme/premiumTheme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'RegistrationType'>;

export function RegistrationTypeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  return (
    <GradientBackground>
      <View
        style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => navigation.navigate('ClubConnect')}>
          <Text style={styles.backTxt}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('registration.typeTitle')}</Text>
        <Text style={styles.sub}>{t('registration.typeSubtitle')}</Text>

        <GlassCard style={styles.card}>
          <Pressable style={styles.typeCard} onPress={() => navigation.navigate('CorporateEntry')}>
            <Text style={styles.typeTitle}>{t('registration.corporateTitle')}</Text>
            <Text style={styles.typeSub}>{t('registration.corporateSubtitle')}</Text>
          </Pressable>

          <Pressable style={styles.typeCard} onPress={() => navigation.navigate('TrainerRegister')}>
            <Text style={styles.typeTitle}>{t('registration.trainerTitle')}</Text>
            <Text style={styles.typeSub}>{t('registration.trainerSubtitle')}</Text>
          </Pressable>

          <Pressable style={styles.typeCard} onPress={() => navigation.navigate('MemberEntry')}>
            <Text style={styles.typeTitle}>{t('registration.memberTitle')}</Text>
            <Text style={styles.typeSub}>{t('registration.memberSubtitle')}</Text>
          </Pressable>
        </GlassCard>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: {
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  sub: {
    color: premium.textMuted,
    fontSize: 15,
    marginBottom: 16,
  },
  card: {
    gap: 10,
  },
  typeCard: {
    borderRadius: premium.radiusSm,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  typeTitle: {
    color: premium.text,
    fontSize: 16,
    fontWeight: '700',
  },
  typeSub: {
    color: premium.textMuted,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
});
