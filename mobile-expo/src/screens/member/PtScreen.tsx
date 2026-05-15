import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { SmartBooking } from '../../components/SmartBooking';
import { premium } from '../../theme/premiumTheme';

export function PtScreen() {
  const insets = useSafeAreaInsets();
  const { tenant } = useMemberAuth();

  if (!tenant) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 60 }]}>
          <Text style={styles.emptyTxt}>Kulüp bilgisi yüklenemedi</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏋️ Personal Training</Text>
          <Text style={styles.subtitle}>Eğitmenini seç, saatini belirle, başla.</Text>
        </View>

        {/* SmartBooking — PT kategorisi */}
        <SmartBooking subdomain={tenant.subdomain} category="personal_training" />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { color: premium.textMuted, fontSize: 14 },
  header: { paddingHorizontal: 20, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '900', color: premium.text },
  subtitle: { fontSize: 14, color: premium.textMuted, marginTop: 4 },
});
