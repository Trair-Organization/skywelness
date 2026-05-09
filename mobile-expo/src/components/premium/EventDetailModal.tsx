import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { premium } from '../../theme/premiumTheme';

type ScheduleItem = { time: string; title: string };

type EventData = {
  id: string;
  title: string;
  description: string | null;
  coachName: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  category?: string;
  requirements?: string | null;
  schedule?: ScheduleItem[] | null;
  clubName?: string | null;
};

type Props = {
  event: EventData | null;
  onClose: () => void;
  onJoin: (eventId: string) => void;
};

const CATEGORY_LABELS: Record<string, { icon: string; label: string }> = {
  yoga: { icon: '🧘', label: 'Yoga' },
  hiit: { icon: '🔥', label: 'HIIT' },
  social: { icon: '🎉', label: 'Sosyal' },
  outdoor: { icon: '🌿', label: 'Outdoor' },
  workshop: { icon: '📚', label: 'Workshop' },
  strength: { icon: '💪', label: 'Güç' },
  general: { icon: '📅', label: 'Etkinlik' },
};

export function EventDetailModal({ event, onClose, onJoin }: Props) {
  if (!event) return null;

  const startDate = new Date(event.startsAt);
  const endDate = event.endsAt ? new Date(event.endsAt) : null;
  const dateStr = startDate.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const startTime = startDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const endTime = endDate?.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const cat = CATEGORY_LABELS[event.category ?? 'general'] ?? CATEGORY_LABELS.general;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Kapak Görseli */}
            {event.imageUrl ? (
              <Image
                source={{ uri: event.imageUrl }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.coverImage, styles.coverPlaceholder]}>
                <Text style={styles.coverEmoji}>{cat.icon}</Text>
              </View>
            )}

            {/* Kategori Badge */}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </View>

            {/* Başlık */}
            <Text style={styles.title}>{event.title}</Text>

            {/* Meta Bilgiler */}
            <View style={styles.metaSection}>
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>📅</Text>
                <Text style={styles.metaText}>{dateStr}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>🕐</Text>
                <Text style={styles.metaText}>
                  {startTime}
                  {endTime ? ` — ${endTime}` : ''}
                </Text>
              </View>
              {event.location && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📍</Text>
                  <Text style={styles.metaText}>{event.location}</Text>
                </View>
              )}
              {event.coachName && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>🏋️</Text>
                  <Text style={styles.metaText}>{event.coachName}</Text>
                </View>
              )}
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>👥</Text>
                <Text style={styles.metaText}>Kapasite: {event.capacity} kişi</Text>
              </View>
              {event.clubName && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>🏢</Text>
                  <Text style={styles.metaText}>{event.clubName}</Text>
                </View>
              )}
            </View>

            {/* Açıklama */}
            {event.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Etkinlik Hakkında</Text>
                <Text style={styles.sectionBody}>{event.description}</Text>
              </View>
            )}

            {/* Program/Ajanda */}
            {event.schedule && event.schedule.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📋 Program</Text>
                {event.schedule.map((item, i) => (
                  <View key={i} style={styles.scheduleRow}>
                    <Text style={styles.scheduleTime}>{item.time}</Text>
                    <View style={styles.scheduleDot} />
                    <Text style={styles.scheduleTitle}>{item.title}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Gereksinimler */}
            {event.requirements && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎒 Neler Gerekli</Text>
                <Text style={styles.sectionBody}>{event.requirements}</Text>
              </View>
            )}
          </ScrollView>

          {/* CTA */}
          <View style={styles.ctaBar}>
            <Pressable
              style={({ pressed }) => [styles.joinBtn, pressed && styles.joinBtnPressed]}
              onPress={() => onJoin(event.id)}
            >
              <Text style={styles.joinBtnTxt}>💬 Katıl</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnTxt}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0a1020',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: premium.glassBorder,
  },
  scrollContent: { paddingBottom: 20 },
  coverImage: { width: '100%', height: 200, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  coverPlaceholder: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: { fontSize: 48 },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginTop: 14,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryIcon: { fontSize: 14 },
  categoryLabel: { color: premium.accentBlue, fontSize: 12, fontWeight: '700' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: premium.text,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  metaSection: { paddingHorizontal: 20, marginTop: 14, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaIcon: { fontSize: 16, width: 24 },
  metaText: { color: premium.textMuted, fontSize: 14, fontWeight: '600', flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { color: premium.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  sectionBody: { color: premium.textMuted, fontSize: 14, lineHeight: 21 },
  // Schedule
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: premium.glassBorder,
  },
  scheduleTime: { color: premium.accentBlue, fontSize: 13, fontWeight: '700', width: 80 },
  scheduleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: premium.accentBlue },
  scheduleTitle: { color: premium.text, fontSize: 14, fontWeight: '600', flex: 1 },
  // CTA
  ctaBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: premium.glassBorder,
  },
  joinBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: premium.accentBlue,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56,189,248,0.1)',
  },
  joinBtnPressed: { backgroundColor: 'rgba(56,189,248,0.25)' },
  joinBtnTxt: { color: premium.accentBlue, fontSize: 16, fontWeight: '800' },
  closeBtn: {
    paddingHorizontal: 20,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnTxt: { color: premium.textMuted, fontSize: 14, fontWeight: '600' },
});
