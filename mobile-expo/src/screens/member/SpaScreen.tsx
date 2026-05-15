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

type CapacityOption = { label: string; value: number; icon: string; desc: string };

const CAPACITY_OPTIONS: CapacityOption[] = [
  { label: 'Tek Kişilik', value: 1, icon: '🧖', desc: 'Bireysel masaj seansı' },
  { label: 'Çift Kişilik', value: 2, icon: '🧖‍♀️🧖‍♂️', desc: 'Çiftler için masaj seansı' },
];

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
  const { tenant, token } = useMemberAuth();
  const [selectedCapacity, setSelectedCapacity] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [roomData, setRoomData] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(false);
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
    if (!tenant?.subdomain || !selectedCapacity) return;
    setLoading(true);
    try {
      const res = await apiJson<SpaRoomResponse>(
        `/v2/schedule/spa-rooms?tenant=${encodeURIComponent(tenant.subdomain)}&date=${selectedDate}&participants=${selectedCapacity}`,
        { auth: false },
      );
      setRoomData(res.rooms || []);
    } catch {
      setRoomData([]);
    } finally {
      setLoading(false);
    }
  }, [tenant?.subdomain, selectedDate, selectedCapacity]);

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
    // Tek kişilik: 1 masöz seç, Çift kişilik: 2 masöz seç
    const count = selectedCapacity === 2 ? Math.min(2, timeSlot.availableTherapists.length) : 1;
    const selectedTherapists = timeSlot.availableTherapists.slice(0, count);
    setSelectedSlot({ room, timeSlot, selectedTherapists });
  }

  // Rezervasyon onayla
  async function confirmBooking() {
    if (!selectedSlot || !token) return;
    setBooking(true);
    try {
      const pkg = findMassagePackage();
      const sessionsNeeded = selectedCapacity!;
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

  // Seçilen kapasiteye göre odaları filtrele
  // Tek kişilik: TÜM odalar kullanılabilir (çift odada da tek kişi masaj olabilir)
  // Çift kişilik: Sadece çift odalar (capacity >= 2)
  const filteredRooms = selectedCapacity
    ? roomData.filter((r) => (selectedCapacity === 2 ? r.capacity >= 2 : true))
    : [];

  // Geçmiş saatleri filtrele
  const now = new Date();
  const currentHour = now.getHours();
  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  // Tüm müsait saatleri topla
  const allTimes = new Set<string>();
  for (const room of filteredRooms) {
    for (const ts of room.timeSlots) {
      if (isToday && parseInt(ts.startTime) <= currentHour) continue;
      allTimes.add(ts.startTime);
    }
  }
  const sortedTimes = Array.from(allTimes).sort();

  // Saat → endTime eşleşmesi (grid'de "14:00-15:00" göstermek için)
  function getEndTime(startTime: string): string {
    for (const room of filteredRooms) {
      const ts = room.timeSlots.find((s) => s.startTime === startTime);
      if (ts) return ts.endTime;
    }
    // Fallback: +1 saat
    const h = parseInt(startTime) + 1;
    return `${String(h).padStart(2, '0')}:00`;
  }

  // Toplam müsait slot sayısı
  const totalBookable = filteredRooms.reduce(
    (sum, room) =>
      sum +
      room.timeSlots.filter(
        (ts) => ts.isBookable && (!isToday || parseInt(ts.startTime) > currentHour),
      ).length,
    0,
  );

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

        {/* Kapasite Seçimi (Tek / Çift) */}
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

        {/* Seçim yapılmadıysa hint */}
        {!selectedCapacity && (
          <View style={styles.hintBox}>
            <Text style={styles.hintIcon}>☝️</Text>
            <Text style={styles.hintText}>
              Yukarıdan seans tipini seçerek müsait odaları ve saatleri görüntüleyin.
            </Text>
          </View>
        )}

        {/* Seçim yapıldıysa: Tarih + Grid */}
        {selectedCapacity && (
          <>
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

            {/* Müsaitlik Özeti */}
            {!loading && filteredRooms.length > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTxt}>
                  {totalBookable > 0
                    ? `✅ ${totalBookable} müsait saat bulundu`
                    : '❌ Bu tarihte müsait saat yok'}
                </Text>
              </View>
            )}

            {loading ? (
              <Text style={styles.loadingTxt}>Yükleniyor...</Text>
            ) : sortedTimes.length === 0 ? (
              <View style={styles.hintBox}>
                <Text style={styles.hintIcon}>📅</Text>
                <Text style={styles.hintText}>
                  Bu tarihte müsait oda slotu bulunmuyor.{'\n'}Başka bir gün deneyin.
                </Text>
              </View>
            ) : selectedCapacity === 2 ? (
              /* ═══ Çift Kişilik: Sadece çift odalar ═══ */
              <View style={styles.gridSection}>
                <Text style={styles.gridTitle}>👫 Çift Kişilik Odalar</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={styles.gridRow}>
                      <View style={styles.gridTimeCell}>
                        <Text style={styles.gridHeaderTxt}>Saat</Text>
                      </View>
                      {filteredRooms.map((room) => (
                        <View key={room.roomId} style={styles.gridProviderCell}>
                          <Text style={styles.gridProviderTxt} numberOfLines={2}>
                            {room.roomName.replace('Masaj Odası ', 'Oda ')}
                          </Text>
                          <Text style={styles.gridProviderCapacity}>{room.price}₺</Text>
                        </View>
                      ))}
                    </View>
                    {sortedTimes.map((time) => (
                      <View key={time} style={styles.gridRow}>
                        <View style={styles.gridTimeCell}>
                          <Text style={styles.gridTimeTxt}>
                            {time}-{getEndTime(time)}
                          </Text>
                        </View>
                        {filteredRooms.map((room) => {
                          const ts = room.timeSlots.find((s) => s.startTime === time);
                          const isBookable = ts?.isBookable ?? false;
                          const displayText =
                            ts && isBookable
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
                                  {displayText || '✓'}
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
            ) : (
              /* ═══ Tek Kişilik: Önce tek oda, sonra çift odalar alternatif ═══ */
              <>
                {(() => {
                  const singleRooms = filteredRooms.filter((r) => r.capacity === 1);
                  const coupleRooms = filteredRooms.filter((r) => r.capacity >= 2);

                  return (
                    <>
                      {/* Bölüm 1: Tek Kişilik Oda (Öncelikli) */}
                      {singleRooms.length > 0 && (
                        <View style={styles.gridSection}>
                          <Text style={styles.gridTitle}>🧖 Tek Kişilik Oda</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View>
                              <View style={styles.gridRow}>
                                <View style={styles.gridTimeCell}>
                                  <Text style={styles.gridHeaderTxt}>Saat</Text>
                                </View>
                                {singleRooms.map((room) => (
                                  <View key={room.roomId} style={styles.gridProviderCell}>
                                    <Text style={styles.gridProviderTxt} numberOfLines={2}>
                                      {room.roomName.replace('Masaj Odası ', 'Oda ')}
                                    </Text>
                                    <Text style={styles.gridProviderCapacity}>{room.price}₺</Text>
                                  </View>
                                ))}
                              </View>
                              {sortedTimes.map((time) => (
                                <View key={time} style={styles.gridRow}>
                                  <View style={styles.gridTimeCell}>
                                    <Text style={styles.gridTimeTxt}>
                                      {time}-{getEndTime(time)}
                                    </Text>
                                  </View>
                                  {singleRooms.map((room) => {
                                    const ts = room.timeSlots.find((s) => s.startTime === time);
                                    const isBookable = ts?.isBookable ?? false;
                                    const count = ts?.availableTherapists.length ?? 0;
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
                                          <Text
                                            style={[
                                              styles.gridCellTxt,
                                              styles.gridCellTxtAvailable,
                                            ]}
                                          >
                                            {count} masöz
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
                      )}

                      {/* Bölüm 2: Çift Odalar (Alternatif) */}
                      {coupleRooms.length > 0 && (
                        <View style={styles.gridSection}>
                          <View style={styles.altHeader}>
                            <Text style={styles.altHeaderTxt}>
                              💡 Tek oda doluysa → Çift odalarda da tek masaj yapılabilir
                            </Text>
                          </View>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View>
                              <View style={styles.gridRow}>
                                <View style={styles.gridTimeCell}>
                                  <Text style={styles.gridHeaderTxt}>Saat</Text>
                                </View>
                                {coupleRooms.map((room) => (
                                  <View key={room.roomId} style={styles.gridProviderCell}>
                                    <Text style={styles.gridProviderTxt} numberOfLines={2}>
                                      {room.roomName.replace('Masaj Odası ', 'Oda ')}
                                    </Text>
                                    <Text style={styles.gridProviderCapacity}>{room.price}₺</Text>
                                  </View>
                                ))}
                              </View>
                              {sortedTimes.map((time) => (
                                <View key={time} style={styles.gridRow}>
                                  <View style={styles.gridTimeCell}>
                                    <Text style={styles.gridTimeTxt}>
                                      {time}-{getEndTime(time)}
                                    </Text>
                                  </View>
                                  {coupleRooms.map((room) => {
                                    const ts = room.timeSlots.find((s) => s.startTime === time);
                                    const isBookable = ts?.isBookable ?? false;
                                    const count = ts?.availableTherapists.length ?? 0;
                                    return (
                                      <Pressable
                                        key={room.roomId}
                                        style={[
                                          styles.gridCell,
                                          isBookable && styles.gridCellAlt,
                                          !isBookable && styles.gridCellBooked,
                                        ]}
                                        onPress={() => {
                                          if (isBookable && ts) handleSlotPress(room, ts);
                                        }}
                                        disabled={!isBookable || booking}
                                      >
                                        {isBookable ? (
                                          <Text style={[styles.gridCellTxt, styles.gridCellTxtAlt]}>
                                            {count} masöz
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
                      )}
                    </>
                  );
                })()}
              </>
            )}
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

                {/* Masöz Seçimi (değiştirilebilir — sadece fazla masöz varsa) */}
                {selectedSlot.timeSlot.availableTherapists.length > selectedCapacity! && (
                  <View style={styles.therapistSelectSection}>
                    <Text style={styles.therapistSelectTitle}>
                      Masöz Değiştir ({selectedCapacity!} seçin)
                    </Text>
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
                              if (selectedSlot.selectedTherapists.length > 1) {
                                setSelectedSlot({
                                  ...selectedSlot,
                                  selectedTherapists: selectedSlot.selectedTherapists.filter(
                                    (st) => st.id !== t.id,
                                  ),
                                });
                              }
                            } else {
                              if (selectedSlot.selectedTherapists.length < selectedCapacity!) {
                                setSelectedSlot({
                                  ...selectedSlot,
                                  selectedTherapists: [...selectedSlot.selectedTherapists, t],
                                });
                              } else {
                                const newList = [
                                  ...selectedSlot.selectedTherapists.slice(0, -1),
                                  t,
                                ];
                                setSelectedSlot({ ...selectedSlot, selectedTherapists: newList });
                              }
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.therapistOptionTxt,
                              isSelected && { color: premium.accentGreen },
                            ]}
                          >
                            {isSelected ? '✓ ' : '○ '}
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
                    <Text style={styles.priceLabel}>Toplam ({selectedCapacity!} kişi)</Text>
                    <Text style={styles.priceValue}>
                      {(parseFloat(selectedSlot.timeSlot.price) * selectedCapacity!).toLocaleString(
                        'tr-TR',
                      )}
                      ₺
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabelSub}>💳 Kapora (%15)</Text>
                    <Text style={styles.priceValueSub}>
                      {Math.ceil(
                        parseFloat(selectedSlot.timeSlot.price) * selectedCapacity! * 0.15,
                      ).toLocaleString('tr-TR')}
                      ₺
                    </Text>
                  </View>
                </View>

                {/* Paket Bilgisi */}
                {(() => {
                  const pkg = findMassagePackage();
                  const sessionsNeeded = selectedCapacity!;
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
                    {(() => {
                      const pkg = findMassagePackage();
                      const sessionsNeeded = selectedCapacity!;
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
  // Capacity Selection
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
  capacityCardActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.1)' },
  capacityIcon: { fontSize: 28 },
  capacityLabel: { fontSize: 14, fontWeight: '800', color: premium.text },
  capacityLabelActive: { color: premium.accentBlue },
  capacityDesc: { fontSize: 11, color: premium.textMuted, textAlign: 'center' },
  // Hint
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
  // Date
  dateRow: { marginBottom: 12 },
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
  // Summary
  summaryRow: { paddingHorizontal: 20, marginBottom: 12 },
  summaryTxt: { fontSize: 13, fontWeight: '700', color: premium.accentGreen },
  loadingTxt: { color: premium.textMuted, textAlign: 'center', padding: 20 },
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
  gridTimeCell: { width: 80, paddingVertical: 8, paddingHorizontal: 4 },
  gridTimeTxt: { fontSize: 11, color: premium.text, fontWeight: '700' },
  gridHeaderTxt: { fontSize: 10, color: premium.textMuted, fontWeight: '700' },
  gridProviderCell: { width: 100, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 2 },
  gridProviderTxt: {
    fontSize: 11,
    color: premium.accentBlue,
    fontWeight: '700',
    textAlign: 'center',
  },
  gridProviderCapacity: {
    fontSize: 10,
    color: premium.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  gridCell: {
    width: 100,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    margin: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  gridCellAvailable: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
  },
  gridCellBooked: { backgroundColor: 'rgba(100,116,139,0.08)' },
  gridCellAlt: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  gridCellTxt: { fontSize: 10, color: premium.textMuted, fontWeight: '700' },
  gridCellTxtAvailable: { color: '#10b981' },
  gridCellTxtAlt: { color: '#fbbf24' },
  // Alt Header
  altHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(251,191,36,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  altHeaderTxt: { fontSize: 12, color: '#fbbf24', fontWeight: '700' },
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
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 6,
  },
  therapistOptionActive: {
    borderColor: premium.accentGreen,
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  therapistOptionTxt: { fontSize: 14, fontWeight: '700', color: premium.text },
  // Price
  priceSection: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 12,
    gap: 8,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 15, fontWeight: '800', color: premium.text },
  priceValue: { fontSize: 18, fontWeight: '900', color: premium.accentGreen },
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
