import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { SmartBooking } from '../../components/SmartBooking';
import { premium } from '../../theme/premiumTheme';

type CapacityOption = { label: string; value: number; icon: string; desc: string };

const CAPACITY_OPTIONS: CapacityOption[] = [
  { label: 'Tek Kişilik', value: 1, icon: '🧖', desc: 'Bireysel masaj seansı' },
  { label: 'Çift Kişilik', value: 2, icon: '🧖‍♀️🧖‍♂️', desc: 'Çiftler için masaj seansı' },
];

export function SpaScreen() {
  const insets = useSafeAreaInsets();
  const { tenant } = useMemberAuth();
  const [selectedCapacity, setSelectedCapacity] = useState<number | null>(null);

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
          <Text style={styles.title}>💆 Spa & Masaj</Text>
          <Text style={styles.subtitle}>Masöz seç, saat seç, rahatla.</Text>
        </View>

        {/* Kapasite Seçimi */}
        <View style={styles.capacitySection}>
          <Text style={styles.sectionTitle}>Seans Tipi Seçin</Text>
          <View style={styles.capacityRow}>
            {CAPACITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.capacityCard,
                  selectedCapacity === opt.value && styles.capacityCardActive,
                ]}
                onPress={() => setSelectedCapacity(opt.value)}
              >
                <Text style={styles.capacityIcon}>{opt.icon}</Text>
                <Text
                  style={[
                    styles.capacityLabel,
                    selectedCapacity === opt.value && styles.capacityLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.capacityDesc}>{opt.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* SmartBooking — masaj kategorisi, kapasite filtreli */}
        {selectedCapacity && <SmartBooking subdomain={tenant.subdomain} category="massage" />}

        {!selectedCapacity && (
          <View style={styles.hintBox}>
            <Text style={styles.hintIcon}>☝️</Text>
            <Text style={styles.hintText}>
              Yukarıdan seans tipini seçerek müsait masözleri ve saatleri görüntüleyin.
            </Text>
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { color: premium.textMuted, fontSize: 14 },
  header: { paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: premium.text },
  subtitle: { fontSize: 14, color: premium.textMuted, marginTop: 4 },
  capacitySection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: premium.text, marginBottom: 12 },
  capacityRow: { flexDirection: 'row', gap: 12 },
  capacityCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    gap: 6,
  },
  capacityCardActive: {
    borderColor: premium.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.1)',
  },
  capacityIcon: { fontSize: 28 },
  capacityLabel: { fontSize: 14, fontWeight: '800', color: premium.text },
  capacityLabelActive: { color: premium.accentBlue },
  capacityDesc: { fontSize: 11, color: premium.textMuted, textAlign: 'center' },
  hintBox: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(56,189,248,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
    alignItems: 'center',
    gap: 8,
  },
  hintIcon: { fontSize: 28 },
  hintText: { fontSize: 13, color: premium.textMuted, textAlign: 'center', lineHeight: 20 },
});
