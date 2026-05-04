import { ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { premium } from '../../theme/premiumTheme';

const TAB_BAR_PAD = 72;

export function MemberNotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + TAB_BAR_PAD },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>{t('tabs.notifications')}</Text>
        <GlassCard>
          <Text style={styles.cardTitle}>{t('notifications.title')}</Text>
          <Text style={styles.muted}>{t('notifications.body')}</Text>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    flexGrow: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 8,
  },
  muted: {
    fontSize: 14,
    lineHeight: 20,
    color: premium.textMuted,
  },
});
