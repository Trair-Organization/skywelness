import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { apiJson } from '../../api/client';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { showToast } from '../../components/premium/Toast';
import { premium } from '../../theme/premiumTheme';

// ─── Types ──────────────────────────────────────────────────────────────────────

type Therapist = { id: string; slotId: string; name: string };

type RoomTimeSlot = {
  roomSlotId: string;
  startTime: string;
  endTime: string;
  price: string;
  currency: string;
  isBookable: boolean;
  requiredTherapists: number;
  availableTherapists: Therapist[];
};

type RoomData = {
  roomId: string;
  roomName: string;
  capacity: number;
  roomType: 'couple' | 'single';
  price: string;
  currency: string;
  timeSlots: RoomTimeSlot[];
};

type SpaRoomResponse = { rooms: RoomData[]; date: string };

type MyPackage = {
  id: string;
  packageTypeName: string;
  sessionType: string;
  remainingSessions: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

function getWeekDays() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      value: d.toISOString().slice(0, 10),
      dayName: DAYS[d.getDay()],
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      isToday: i === 0,
    });
  }
  return days;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function SpaScreen() {
  const insets = useSafeAreaInsets();
  const { tenant, token, user } = useMemberAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [roomData, setRoomData] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [myPackages, setMyPackages] = useState<MyPackage[]>([]);

  // Modal state
  const [selectedSlot, setSelectedSlot] = useState<{
    room: RoomData;
    timeSlot: RoomTimeSlot;
    selectedTherapists: Therapist[];
  } | null>(null);

  // Success animation
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    room: string;
    therapists: string[];
    time: string;
    remaining: number | null;
    packageName: string | null;
  } | null>(null);
  const successAnim = useRef(new Animated.Value(0)).current;

  const days = getWeekDays();

  // Paketleri yükle
  useEffect(() => {
    if (!token) return;
    apiJson<MyPackage[]>('/v2/my-packages', { token, tenantSubdomain: tenant?.subdomain })
      .then(setMyPackages)
      .catch(() => setMyPackages([]));
  }, [token, tenant?.subdomain]);

  // Oda müsaitliğini yükle
  const loadRooms = useCallback(async () => {
    if (!tenant?.subdomain) return;
    setLoading(true);
    try {
      const res = await apiJson<SpaRoomResponse>(
        `/v2/schedule/spa-rooms?tenant=${encodeURIComponent(tenant.subdomain)}&date=${selectedDate}`,
        { auth: false },
      );
      setRoomData(res.rooms || []);
    } catch {
      setRoomData([]);
    } finally {
      setLoading(false);
    }
  }, [tenant?.subdomain, selectedDate]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  // Masaj paketi bul
  function findMassagePackage(): MyPackage | null {
    return myPackages.find((p) => p.sessionType === 'massage' && p.remainingSessions > 0) ?? null;
  }

  // Slot seçimi
  function handleSlotPress(room: RoomData, timeSlot: RoomTimeSlot) {
    if (!timeSlot.isBookable) return;
    // Otomatik masöz seçimi: ilk N masözü seç
    const selectedTherapists = timeSlot.availableTherapists.slice(0, timeSlot.requiredTherapists);
    setSelectedSlot({ room, timeSlot, selectedTherapists });
  }

  // Rezervasyon onayla
  async function confirmBooking() {
    if (!selectedSlot || !token) return;
    setBooking(true);
    try {
      const pkg = findMassagePackage();
      const sessionsNeeded = selectedSlot.room.capacity;
      const usePackage = pkg && pkg.remainingSessions >= sessionsNeeded;

      const res = await apiJson<{
        id: string;
        room: string;
        therapists: string[];
        startTime: string;
        endTime: string;
        remainingSessions: number | null;
        packageName: string | null;
      }>('/v2/appointments/spa-room', {
        method: 'POST',
        token,
        tenantSubdomain: tenant?.subdomain,
        body: JSON.stringify({
          roomSlotId: selectedSlot.timeSlot.roomSlotId,
          therapistSlotIds: selectedSlot.selectedTherapists.map((t) => t.slotId),
          packageId: usePackage ? pkg!.id : undefined,
        }),
      });

      // Başarı animasyonu
      setBookingSuccess(true);
      setSuccessData({
        room: res.room,
        therapists: res.therapists,
        time: `${res.startTime}-${res.endTime}`,
        remaining: res.remainingSessions,
        packageName: res.packageName,
      });
      Animated.spring(successAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Paket güncelle
      if (usePackage && res.remainingSessions !== null) {
        setMyPackages((prev) =>
          prev.map((p) =>
            p.id === pkg!.id ? { ...p, remainingSessions: res.remainingSessions! } : p,
          ),
        );
      }

      setTimeout(() => {
        setBookingSuccess(false);
        setSuccessData(null);
        successAnim.setValue(0);
        setSelectedSlot(null);
        void loadRooms();
      }, 4000);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Rezervasyon başarısız', 'error');
    } finally {
      setBooking(false);
    }
  }

  if (!tenant) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 60 }]}>
          <Text style={styles.emptyTxt}>Kulüp bilgisi yüklenemedi</Text>
        </View>
      </GradientBackground>
    );
  }

  // Saatleri hesapla (grid için)
  const now = new Date();
  const currentHour = now.getHours();
  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  // Tüm odaların tüm saatlerini birleştir
  const allTimes = new Set<string>();
  for (const room of roomData) {
    for (const ts of room.timeSlots) {
      allTimes.add(ts.startTime);
    }
  }
  const sortedTimes = Array.from(allTimes)
    .sort()
    .filter((t) => !isToday || parseInt(t) > currentHour);

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
          <Text style={styles.subtitle}>Oda seç, masöz seç, rahatla.</Text>
        </View>

        {/* Tarih Seçimi */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateRow}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {days.map((d) => (
            <Pressable
              key={d.value}
              onPress={() => setSelectedDate(d.value)}
              style={[styles.dateChip, selectedDate === d.value && styles.dateChipActive]}
            >
              <Text style={[styles.dateDay, selectedDate === d.value && styles.dateTxtActive]}>
                {d.dayName}
              </Text>
              <Text style={[styles.dateNum, selectedDate === d.value && styles.dateTxtActive]}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <Text style={styles.loadingTxt}>Yükleniyor...</Text>
        ) : roomData.length === 0 ? (
          <View style={styles.hintBox}>
            <Text style={styles.hintIcon}>📅</Text>
            <Text style={styles.hintText}>Bu tarihte müsait oda slotu bulunmuyor.</Text>
          </View>
        ) : (
          <>
            {/* Grid: Odalar sütun, Saatler dikey */}
            <View style={styles.gridSection}>
              <Text style={styles.gridTitle}>🏠 Oda Müsaitliği</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Header: Oda isimleri */}
                  <View style={styles.gridRow}>
                    <View style={styles.gridTimeCell}>
                      <Text style={styles.gridHeaderTxt}>Saat</Text>
                    </View>
                    {roomData.map((room) => (
                      <View key={room.roomId} style={styles.gridProviderCell}>
                        <Text style={styles.gridProviderTxt} numberOfLines={2}>
                          {room.roomName.replace('Masaj Odası ', 'Oda ')}
                        </Text>
                        <Text style={styles.gridProviderCapacity}>
                          {room.capacity >= 2 ? '👫 Çift' : '🧖 Tek'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Rows: Her saat */}
                  {sortedTimes.map((time) => (
                    <View key={time} style={styles.gridRow}>
                      <View style={styles.gridTimeCell}>
                        <Text style={styles.gridTimeTxt}>{time}</Text>
                      </View>
                      {roomData.map((room) => {
                        const ts = room.timeSlots.find((s) => s.startTime === time);
                        const isBookable = ts?.isBookable ?? false;
                        const therapistNames = ts
                          ? ts.availableTherapists
                              .slice(0, ts.requiredTherapists)
                              .map((t) => t.name.split(' ')[0])
                              .join('+')
                          : '';
                        return (
                          <Pressable
                            key={room.roomId}
                            style={[
                              styles.gridCell,
                              isBookable && styles.gridCellAvailable,
                              !isBookable && styles.gridCellBooked,
                            ]}
                            onPress={() => {
                              if (isBookable && ts) handleSlotPress(room, ts);
                            }}
                            disabled={!isBookable || booking}
                          >
                            {isBookable ? (
                              <Text style={[styles.gridCellTxt, styles.gridCellTxtAvailable]}>
                                {therapistNames || '✓'}
                              </Text>
                            ) : (
                              <Text style={styles.gridCellTxt}>—</Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Oda Bilgi Kartları */}
            <View style={styles.roomInfoSection}>
              {roomData.map((room) => {
                const bookableCount = room.timeSlots.filter((ts) => ts.isBookable).length;
                return (
                  <View key={room.roomId} style={styles.roomInfoCard}>
                    <Text style={styles.roomInfoIcon}>{room.capacity >= 2 ? '👫' : '🧖'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomInfoName}>{room.roomName}</Text>
                      <Text style={styles.roomInfoMeta}>
                        {room.capacity} kişi · {room.price}₺
                      </Text>
                    </View>
                    <Text style={styles.roomInfoAvail}>{bookableCount} müsait</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Onay Modal */}
      <Modal
        visible={!!selectedSlot}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSlot(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedSlot(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {bookingSuccess && successData ? (
              <Animated.View style={[styles.successBox, { transform: [{ scale: successAnim }] }]}>
                <Text style={styles.successIcon}>🎉</Text>
                <Text style={styles.successTitle}>Rezervasyon Onaylandı!</Text>
                <Text style={styles.successDetailRow}>🏠 {successData.room}</Text>
                <Text style={styles.successDetailRow}>💆 {successData.therapists.join(' + ')}</Text>
                <Text style={styles.successDetailRow}>🕐 {successData.time}</Text>
                {successData.packageName && (
                  <Text style={styles.successDetailRow}>
                    📦 {successData.packageName} · Kalan: {successData.remaining} seans
                  </Text>
                )}
              </Animated.View>
            ) : selectedSlot ? (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <Text style={styles.modalTitle}>Rezervasyon Onayı</Text>

                {/* Oda + Masöz + Saat bilgisi */}
                <View style={styles.modalSlotInfo}>
                  <Text style={styles.modalRoomName}>🏠 {selectedSlot.room.roomName}</Text>
                  <Text style={styles.modalTherapists}>
                    💆 {selectedSlot.selectedTherapists.map((t) => t.name).join(' + ')}
                  </Text>
                  <Text style={styles.modalTime}>
                    🕐 {selectedSlot.timeSlot.startTime} - {selectedSlot.timeSlot.endTime}
                  </Text>
                </View>

                {/* Masöz Seçimi (değiştirilebilir) */}
                {selectedSlot.timeSlot.availableTherapists.length > selectedSlot.room.capacity && (
                  <View style={styles.therapistSelectSection}>
                    <Text style={styles.therapistSelectTitle}>Masöz Seçimi</Text>
                    {selectedSlot.timeSlot.availableTherapists.map((t) => {
                      const isSelected = selectedSlot.selectedTherapists.some(
                        (st) => st.id === t.id,
                      );
                      return (
                        <Pressable
                          key={t.id}
                          style={[
                            styles.therapistOption,
                            isSelected && styles.therapistOptionActive,
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              // Deselect (min kontrolü)
                              if (
                                selectedSlot.selectedTherapists.length > selectedSlot.room.capacity
                              ) {
                                setSelectedSlot({
                                  ...selectedSlot,
                                  selectedTherapists: selectedSlot.selectedTherapists.filter(
                                    (st) => st.id !== t.id,
                                  ),
                                });
                              }
                            } else {
                              // Select (max kontrolü)
                              if (
                                selectedSlot.selectedTherapists.length < selectedSlot.room.capacity
                              ) {
                                setSelectedSlot({
                                  ...selectedSlot,
                                  selectedTherapists: [...selectedSlot.selectedTherapists, t],
                                });
                              } else {
                                // Swap: son eklenen ile değiştir
                                const newList = [
                                  ...selectedSlot.selectedTherapists.slice(0, -1),
                                  t,
                                ];
                                setSelectedSlot({
                                  ...selectedSlot,
                                  selectedTherapists: newList,
                                });
                              }
                            }
                          }}
                        >
                          <Text style={styles.therapistOptionTxt}>
                            {isSelected ? '✓ ' : ''}
                            {t.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* Fiyat Bilgisi */}
                <View style={styles.priceSection}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Toplam Fiyat</Text>
                    <Text style={styles.priceValue}>
                      {(
                        parseFloat(selectedSlot.timeSlot.price) * selectedSlot.room.capacity
                      ).toLocaleString('tr-TR')}
                      ₺
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabelSub}>💳 Kapora (%15)</Text>
                    <Text style={styles.priceValueSub}>
                      {Math.ceil(
                        parseFloat(selectedSlot.timeSlot.price) * selectedSlot.room.capacity * 0.15,
                      ).toLocaleString('tr-TR')}
                      ₺
                    </Text>
                  </View>
                </View>

                {/* Paket Bilgisi */}
                {(() => {
                  const pkg = findMassagePackage();
                  const sessionsNeeded = selectedSlot.room.capacity;
                  if (pkg && pkg.remainingSessions >= sessionsNeeded) {
                    return (
                      <View style={styles.packageInfo}>
                        <Text style={styles.packageTitle}>📦 {pkg.packageTypeName}</Text>
                        <Text style={styles.packageMeta}>
                          Kalan: {pkg.remainingSessions} seans → kullanım: {sessionsNeeded}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })()}

                {/* Butonlar */}
                {token ? (
                  <View style={{ gap: 8, marginTop: 12 }}>
                    {/* Paketten Kullan */}
                    {(() => {
                      const pkg = findMassagePackage();
                      const sessionsNeeded = selectedSlot.room.capacity;
                      if (pkg && pkg.remainingSessions >= sessionsNeeded) {
                        return (
                          <Pressable
                            style={[styles.confirmBtn, { backgroundColor: '#10b981' }]}
                            onPress={confirmBooking}
                            disabled={booking}
                          >
                            <Text style={styles.confirmBtnTxt}>
                              {booking
                                ? 'İşleniyor...'
                                : `✓ Paketten Kullan (${sessionsNeeded} seans)`}
                            </Text>
                          </Pressable>
                        );
                      }
                      return null;
                    })()}
                    {/* Kapora Öde */}
                    <Pressable
                      style={[styles.confirmBtn, { backgroundColor: '#6366f1' }]}
                      onPress={confirmBooking}
                      disabled={booking}
                    >
                      <Text style={styles.confirmBtnTxt}>
                        {booking ? 'Yönlendiriliyor...' : '💳 Kapora Öde'}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.loginPrompt}>
                    <Text style={styles.loginPromptTxt}>
                      Rezervasyon için giriş yapmanız gerekiyor.
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </GradientBackground>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { color: premium.textMuted, fontSize: 14 },
  header: { paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: premium.text },
  subtitle: { fontSize: 14, color: premium.textMuted, marginTop: 4 },
  // Date
  dateRow: { marginBottom: 16 },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginRight: 8,
    alignItems: 'center',
  },
  dateChipActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.15)' },
  dateDay: { fontSize: 11, color: premium.textMuted, fontWeight: '600' },
  dateNum: { fontSize: 14, color: premium.text, fontWeight: '800', marginTop: 2 },
  dateTxtActive: { color: premium.accentBlue },
  loadingTxt: { color: premium.textMuted, textAlign: 'center', padding: 20 },
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
  // Grid
  gridSection: { marginBottom: 16, paddingHorizontal: 8 },
  gridTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  gridTimeCell: { width: 60, paddingVertical: 8, paddingHorizontal: 4 },
  gridTimeTxt: { fontSize: 11, color: premium.text, fontWeight: '700' },
  gridHeaderTxt: { fontSize: 10, color: premium.textMuted, fontWeight: '700' },
  gridProviderCell: { width: 90, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 2 },
  gridProviderTxt: {
    fontSize: 11,
    color: premium.accentBlue,
    fontWeight: '700',
    textAlign: 'center',
  },
  gridProviderCapacity: {
    fontSize: 9,
    color: premium.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  gridCell: {
    width: 90,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  gridCellAvailable: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
  },
  gridCellBooked: { backgroundColor: 'rgba(100,116,139,0.1)' },
  gridCellTxt: { fontSize: 10, color: premium.textMuted, fontWeight: '700' },
  gridCellTxtAvailable: { color: '#10b981' },
  // Room Info
  roomInfoSection: { paddingHorizontal: 20, gap: 8, marginTop: 8 },
  roomInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(15,23,42,0.4)',
    gap: 12,
  },
  roomInfoIcon: { fontSize: 24 },
  roomInfoName: { fontSize: 14, fontWeight: '800', color: premium.text },
  roomInfoMeta: { fontSize: 11, color: premium.textMuted, marginTop: 2 },
  roomInfoAvail: { fontSize: 12, fontWeight: '700', color: premium.accentGreen },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0b1220',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: premium.text, marginBottom: 16 },
  modalSlotInfo: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    marginBottom: 14,
    gap: 6,
  },
  modalRoomName: { fontSize: 16, fontWeight: '800', color: premium.text },
  modalTherapists: { fontSize: 14, fontWeight: '700', color: premium.accentBlue },
  modalTime: { fontSize: 13, color: premium.textMuted, fontWeight: '600' },
  // Therapist Select
  therapistSelectSection: { marginBottom: 14 },
  therapistSelectTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: premium.text,
    marginBottom: 8,
  },
  therapistOption: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 6,
  },
  therapistOptionActive: {
    borderColor: premium.accentGreen,
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  therapistOptionTxt: { fontSize: 13, fontWeight: '700', color: premium.text },
  // Price
  priceSection: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 12,
    gap: 6,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, fontWeight: '800', color: premium.text },
  priceValue: { fontSize: 16, fontWeight: '900', color: premium.accentGreen },
  priceLabelSub: { fontSize: 12, color: premium.textMuted },
  priceValueSub: { fontSize: 13, fontWeight: '700', color: premium.textMuted },
  // Package
  packageInfo: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    marginBottom: 12,
  },
  packageTitle: { fontSize: 13, fontWeight: '700', color: premium.accentGreen },
  packageMeta: { fontSize: 12, color: premium.textMuted, marginTop: 2 },
  // Buttons
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  loginPrompt: { padding: 16, alignItems: 'center' },
  loginPromptTxt: { fontSize: 13, color: premium.textMuted, textAlign: 'center' },
  // Success
  successBox: { alignItems: 'center', padding: 20, gap: 8 },
  successIcon: { fontSize: 48 },
  successTitle: { fontSize: 18, fontWeight: '900', color: premium.accentGreen },
  successDetailRow: { fontSize: 14, color: premium.text, fontWeight: '600' },
});
