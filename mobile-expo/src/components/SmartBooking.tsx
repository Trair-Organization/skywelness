import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { apiJson } from '../api/client';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { showToast } from '../components/premium/Toast';
import { premium } from '../theme/premiumTheme';

type AddonItem = { id: string; name: string; price: string; description: string | null };

function GuestCheckout({
  slotId,
  subdomain,
  addons,
  onClose,
}: {
  slotId: string;
  subdomain: string;
  addons: Array<{ addonId: string; quantity: number }>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    if (!name.trim() || !phone.trim() || !email.trim()) {
      showToast('Tüm alanları doldurun', 'warning');
      return;
    }
    if (!acceptedTerms) {
      showToast('Sözleşmeyi kabul etmelisiniz', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await apiJson<{ checkoutUrl: string }>('/v2/checkout', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          slotId,
          addons: addons.length > 0 ? addons : undefined,
          guestName: name.trim(),
          guestPhone: phone.trim(),
          guestEmail: email.trim(),
        }),
      });
      if (res.checkoutUrl) {
        // In-app browser açar, ödeme sonrası success/cancel URL'e gelince otomatik kapanır
        const result = await WebBrowser.openAuthSessionAsync(
          res.checkoutUrl,
          'wellnessclubai://booking-success', // redirect URI — browser bunu görünce kapanır
        );
        onClose();
        if (result.type === 'success') {
          showToast('Ödeme başarılı! Biletiniz e-postanıza gönderildi 🎉', 'success');
        } else if (result.type === 'cancel') {
          showToast('Ödeme iptal edildi', 'warning');
        }
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ödeme başlatılamadı', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Text style={guestStyles.divider}>— misafir olarak devam edin —</Text>

      <Text style={guestStyles.subtitle}>
        Bilgilerinizi girin, ödeme sonrası e-posta adresinize bilet gönderilecektir.
      </Text>
      <TextInput
        style={guestStyles.input}
        placeholder="Ad Soyad *"
        placeholderTextColor="#64748b"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={guestStyles.input}
        placeholder="Telefon *"
        placeholderTextColor="#64748b"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={guestStyles.input}
        placeholder="E-posta *"
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Pressable style={guestStyles.termsRow} onPress={() => setAcceptedTerms(!acceptedTerms)}>
        <View style={[guestStyles.checkbox, acceptedTerms && guestStyles.checkboxChecked]}>
          {acceptedTerms && <Text style={guestStyles.checkmark}>✓</Text>}
        </View>
        <Text style={guestStyles.termsText}>
          <Text style={guestStyles.termsLink}>Hizmet Kullanım Sözleşmesi</Text> ve{' '}
          <Text style={guestStyles.termsLink}>Rezervasyon Kuralları</Text>'nı okudum, kabul
          ediyorum.
        </Text>
      </Pressable>
      <View style={guestStyles.policyBox}>
        <Text style={guestStyles.policyTitle}>📋 İptal Politikası</Text>
        <Text style={guestStyles.policyText}>
          • 3 saat öncesine kadar: %100 iade{'\n'}• 3 saatten az: İade yok{'\n'}• No-show: İade yok
        </Text>
      </View>
      <Pressable
        style={[
          guestStyles.payBtn,
          (!acceptedTerms || !name || !phone || !email) && { opacity: 0.5 },
        ]}
        onPress={handlePay}
        disabled={loading || !acceptedTerms || !name.trim() || !phone.trim() || !email.trim()}
      >
        <Text style={guestStyles.payBtnTxt}>
          {loading ? 'Yönlendiriliyor...' : '💳 Kapora Öde'}
        </Text>
      </Pressable>
      <Text style={guestStyles.kaporaNote}>
        Sadece %15 kapora alınır. Kalan tutarı kulüpte ödersiniz.
      </Text>
    </View>
  );
}

const guestStyles = StyleSheet.create({
  divider: { textAlign: 'center', color: premium.textMuted, fontSize: 10, marginBottom: 8 },
  subtitle: { fontSize: 10, color: premium.textMuted, marginBottom: 8, lineHeight: 14 },
  input: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 8,
    padding: 8,
    color: premium.text,
    fontSize: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginVertical: 6 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: premium.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: premium.accentGreen, borderColor: premium.accentGreen },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '800' },
  termsText: { flex: 1, fontSize: 10, color: premium.textMuted, lineHeight: 14 },
  termsLink: { color: premium.accentBlue, fontWeight: '600' },
  payBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  payBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  policyBox: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(251,191,36,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  policyTitle: { fontSize: 10, fontWeight: '700', color: '#fbbf24', marginBottom: 2 },
  policyText: { fontSize: 9, color: premium.textMuted, lineHeight: 14 },
  kaporaNote: { fontSize: 10, color: premium.textMuted, textAlign: 'center', marginTop: 6 },
});

type V2Service = {
  id: string;
  name: string;
  category: string;
  providerType: string;
  providerId: string | null;
  providerName: string | null;
  durationMinutes: number;
  price: string;
  currency: string;
  capacity: number;
};

type V2Slot = {
  id: string;
  serviceId: string;
  providerType: string;
  providerId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  remainingCapacity: number;
  price: string;
  currency: string;
};

type Props = {
  subdomain: string;
  category?: string; // 'court_rental' | 'personal_training' | 'massage' | undefined (all)
  providerId?: string; // Belirli bir eğitmen/masöz için filtrele
};

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

export function SmartBooking({ subdomain, category, providerId }: Props) {
  const { token, tenant, user } = useMemberAuth();
  const navigation = useNavigation();
  const [services, setServices] = useState<V2Service[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [allSlots, setAllSlots] = useState<V2Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const days = getWeekDays();

  // Hizmetleri ve add-on'ları yükle
  useEffect(() => {
    const q = category ? `&category=${category}` : '';
    apiJson<V2Service[]>(`/v2/services?tenant=${encodeURIComponent(subdomain)}${q}`, {
      auth: false,
    })
      .then((data) => {
        // providerId varsa sadece o eğitmenin hizmetlerini göster
        if (providerId) {
          setServices(data.filter((s) => s.providerId === providerId));
        } else {
          setServices(data);
        }
      })
      .catch(() => setServices([]));
    apiJson<AddonItem[]>(`/v2/addons?tenant=${encodeURIComponent(subdomain)}`, { auth: false })
      .then(setAddons)
      .catch(() => setAddons([]));
  }, [subdomain, category, providerId]);

  // Slotları yükle
  const loadSlots = useCallback(async () => {
    if (services.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let slots: V2Slot[];
      if (providerId) {
        // Provider bazlı slot yükleme
        slots = await apiJson<V2Slot[]>(
          `/v2/schedule/provider?tenant=${encodeURIComponent(subdomain)}&providerId=${providerId}&date=${selectedDate}`,
          { auth: false },
        ).catch(() => [] as V2Slot[]);
      } else {
        // Tüm hizmetler için slot yükleme
        const results = await Promise.all(
          services.map((svc) =>
            apiJson<V2Slot[]>(
              `/v2/schedule?tenant=${encodeURIComponent(subdomain)}&serviceId=${svc.id}&date=${selectedDate}`,
              { auth: false },
            ).catch(() => [] as V2Slot[]),
          ),
        );
        slots = results.flat();
      }
      setAllSlots(slots);
    } finally {
      setLoading(false);
    }
  }, [services, subdomain, selectedDate, providerId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  // Önerilen slotlar (akıllı sıralama)
  const now = new Date();
  const currentHour = now.getHours();
  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const availableSlots = allSlots
    .filter((s) => s.remainingCapacity > 0)
    .filter((s) => !isToday || parseInt(s.startTime) > currentHour);

  // Profesyonel öneri algoritması
  const scored = availableSlots.map((slot) => {
    let score = 0;
    const hour = parseInt(slot.startTime);

    // 1. Prime time bonus (18-21 arası en popüler)
    if (hour >= 18 && hour <= 21) score += 30;
    // 2. Akşam üstü bonus (16-18)
    else if (hour >= 16 && hour < 18) score += 20;
    // 3. Sabah erken bonus (07-09 — sporcular)
    else if (hour >= 7 && hour <= 9) score += 15;
    // 4. Öğle arası bonus (12-14)
    else if (hour >= 12 && hour <= 14) score += 10;

    // 5. Yakınlık bonusu (şu ana yakın saatler)
    if (isToday) {
      const diff = hour - currentHour;
      if (diff <= 2)
        score += 25; // 2 saat içinde
      else if (diff <= 4) score += 15;
    }

    // 6. Kapasite bonusu (büyük kort = daha çok gelir)
    const svc = services.find((s) => s.id === slot.serviceId);
    if (svc && svc.capacity >= 4) score += 10;

    // 7. Uygun fiyat bonusu
    if (svc && parseFloat(svc.price) <= 3000) score += 5;

    return { ...slot, score, serviceName: svc?.providerName || svc?.name || '' };
  });

  // Sırala ve her hizmet için en iyi 1 slot seç
  scored.sort((a, b) => b.score - a.score);
  const recommended: typeof scored = [];
  const usedServices = new Set<string>();
  for (const slot of scored) {
    if (recommended.length >= services.length) break;
    if (!usedServices.has(slot.serviceId)) {
      recommended.push(slot);
      usedServices.add(slot.serviceId);
    }
  }

  // Grid: service × saat
  const hours = Array.from({ length: 17 }, (_, i) => ({
    start: `${String(i + 7).padStart(2, '0')}:00`,
    end: `${String(i + 8).padStart(2, '0')}:00`,
    label: `${String(i + 7).padStart(2, '0')}:00-${String(i + 8).padStart(2, '0')}:00`,
  }));

  function handleSlotSelect(slotId: string) {
    // Giriş yapmamış kullanıcı da modal'ı görsün — içinde giriş/kayıt CTA olacak
    setSelectedSlotId(slotId);
    setSelectedAddons({});
  }

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  async function confirmBooking() {
    if (!selectedSlotId) return;
    setBooking(true);
    try {
      const addonsList = Object.entries(selectedAddons)
        .filter(([, qty]) => qty > 0)
        .map(([addonId, quantity]) => ({ addonId, quantity }));

      // Kayıtlı üye de kapora öder — Stripe checkout
      const res = await apiJson<{ checkoutUrl: string }>('/v2/checkout', {
        method: 'POST',
        token,
        tenantSubdomain: tenant?.subdomain,
        body: JSON.stringify({
          slotId: selectedSlotId,
          addons: addonsList.length > 0 ? addonsList : undefined,
          // Üye bilgileri backend'den alınacak (token ile)
          guestEmail: user?.email,
          guestName: user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
          guestPhone: user?.phone || undefined,
        }),
      });
      if (res.checkoutUrl) {
        const result = await WebBrowser.openAuthSessionAsync(
          res.checkoutUrl,
          'wellnessclubai://booking-success',
        );
        setSelectedSlotId(null);
        if (result.type === 'success') {
          showToast('Ödeme başarılı! Biletiniz e-postanıza gönderildi 🎉', 'success');
          void loadSlots();
        } else if (result.type === 'cancel') {
          showToast('Ödeme iptal edildi', 'warning');
        }
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ödeme başlatılamadı', 'error');
    } finally {
      setBooking(false);
    }
  }

  if (services.length === 0) return null;

  const getSlotForServiceHour = (serviceId: string, hour: string): V2Slot | undefined => {
    return allSlots.find((s) => s.serviceId === serviceId && s.startTime === hour);
  };

  const getServiceName = (serviceId: string): string => {
    const svc = services.find((s) => s.id === serviceId);
    return svc?.providerName || svc?.name || '';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>📅 Rezervasyon</Text>

      {/* Tarih Seçimi */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
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
      ) : (
        <>
          {/* ⚡ Önerilen Saatler */}
          {recommended.length > 0 && (
            <View style={styles.recommendedSection}>
              <Text style={styles.recommendedTitle}>⚡ Önerilen Saatler</Text>
              {recommended.map((slot) => {
                const hour = parseInt(slot.startTime);
                const badge =
                  hour >= 18 && hour <= 21
                    ? '🔥 Popüler'
                    : hour >= 7 && hour <= 9
                      ? '🌅 Erken'
                      : isToday && hour - currentHour <= 2
                        ? '⏰ Yakında'
                        : '';
                return (
                  <Pressable
                    key={slot.id}
                    style={styles.recommendedCard}
                    onPress={() => handleSlotSelect(slot.id)}
                    disabled={booking}
                  >
                    <View style={styles.recommendedLeft}>
                      <Text style={styles.recommendedTime}>
                        {slot.startTime} - {slot.endTime}
                      </Text>
                      <Text style={styles.recommendedName}>{slot.serviceName}</Text>
                      {badge ? <Text style={styles.recommendedBadge}>{badge}</Text> : null}
                    </View>
                    <View style={styles.recommendedRight}>
                      <Text style={styles.recommendedPrice}>{slot.price}₺</Text>
                      {token && <Text style={styles.recommendedCta}>Hemen Al →</Text>}
                    </View>
                  </Pressable>
                );
              })}
              {!token && <Text style={styles.loginHint}>Rezervasyon için giriş yapın</Text>}
            </View>
          )}

          {/* 📊 Grid: Saatler dikey, Hizmetler yatay (üstte) */}
          <View style={styles.gridSection}>
            <Text style={styles.gridTitle}>📊 Tüm Saatler</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header: Hizmet/Kort isimleri */}
                <View style={styles.gridRow}>
                  <View style={styles.gridTimeCell}>
                    <Text style={styles.gridHeaderTxt}>Saat</Text>
                  </View>
                  {services.map((svc) => {
                    const name = svc.name
                      .replace(' (4 Kişilik)', '')
                      .replace(' (2 Kişilik)', '')
                      .replace(' - PT Seansı', '')
                      .replace(' - Masaj Seansı', '');
                    const capacity = svc.capacity > 1 ? `${svc.capacity} kişi` : '';
                    return (
                      <View key={svc.id} style={styles.gridProviderCell}>
                        <Text style={styles.gridProviderTxt} numberOfLines={1}>
                          {svc.providerName || name}
                        </Text>
                        {capacity ? (
                          <Text style={styles.gridProviderCapacity}>{capacity}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
                {/* Rows: Her saat */}
                {hours
                  .filter((h) => !isToday || parseInt(h.start) > currentHour)
                  .map((h) => (
                    <View key={h.start} style={styles.gridRow}>
                      <View style={styles.gridTimeCell}>
                        <Text style={styles.gridTimeTxt}>{h.label}</Text>
                      </View>
                      {services.map((svc) => {
                        const slot = getSlotForServiceHour(svc.id, h.start);
                        const available = slot && slot.remainingCapacity > 0;
                        return (
                          <Pressable
                            key={svc.id}
                            style={[
                              styles.gridCell,
                              available && styles.gridCellAvailable,
                              !available && styles.gridCellBooked,
                            ]}
                            onPress={() => {
                              if (available && slot) handleSlotSelect(slot.id);
                            }}
                            disabled={!available || booking}
                          >
                            <Text
                              style={[styles.gridCellTxt, available && styles.gridCellTxtAvailable]}
                            >
                              {available ? '✓' : '—'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
              </View>
            </ScrollView>
          </View>

          {availableSlots.length === 0 && (
            <Text style={styles.noSlots}>Bu tarihte müsait saat yok</Text>
          )}
        </>
      )}

      {/* Add-on Onay Modal */}
      <Modal
        visible={!!selectedSlotId}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSlotId(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedSlotId(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Rezervasyon Onayı</Text>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {(() => {
                const slot = allSlots.find((s) => s.id === selectedSlotId);
                const svc = slot ? services.find((s) => s.id === slot.serviceId) : null;
                const slotPrice = slot ? parseFloat(slot.price) : 0;
                const addonTotal = Object.entries(selectedAddons).reduce((sum, [id, qty]) => {
                  const addon = addons.find((a) => a.id === id);
                  return sum + (addon ? parseFloat(addon.price) * qty : 0);
                }, 0);
                return (
                  <>
                    {slot && (
                      <View style={styles.modalSlotInfo}>
                        <Text style={styles.modalSlotTime}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                        <Text style={styles.modalSlotName}>{svc?.providerName || svc?.name}</Text>
                        <Text style={styles.modalSlotPrice}>{slot.price}₺</Text>
                      </View>
                    )}
                    {addons.length > 0 && (
                      <View style={styles.modalAddonSection}>
                        <Text style={styles.modalAddonTitle}>
                          Ekstra hizmet eklemek ister misiniz?
                        </Text>
                        {addons.map((addon) => (
                          <View key={addon.id} style={styles.modalAddonRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.modalAddonName}>{addon.name}</Text>
                              <Text style={styles.modalAddonPrice}>{addon.price}₺</Text>
                            </View>
                            <View style={styles.modalQtyRow}>
                              <Pressable
                                style={styles.modalQtyBtn}
                                onPress={() =>
                                  setSelectedAddons((p) => ({
                                    ...p,
                                    [addon.id]: Math.max(0, (p[addon.id] || 0) - 1),
                                  }))
                                }
                              >
                                <Text style={styles.modalQtyBtnTxt}>−</Text>
                              </Pressable>
                              <Text style={styles.modalQtyNum}>
                                {selectedAddons[addon.id] || 0}
                              </Text>
                              <Pressable
                                style={styles.modalQtyBtn}
                                onPress={() =>
                                  setSelectedAddons((p) => ({
                                    ...p,
                                    [addon.id]: (p[addon.id] || 0) + 1,
                                  }))
                                }
                              >
                                <Text style={styles.modalQtyBtnTxt}>+</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={styles.modalTotalRow}>
                      <Text style={styles.modalTotalLabel}>Toplam</Text>
                      <Text style={styles.modalTotalPrice}>
                        {(slotPrice + addonTotal).toLocaleString('tr-TR')}₺
                      </Text>
                    </View>
                    <View style={styles.modalKaporaRow}>
                      <Text style={styles.modalKaporaLabel}>💳 Kapora (%15)</Text>
                      <Text style={styles.modalKaporaPrice}>
                        {Math.ceil((slotPrice + addonTotal) * 0.15).toLocaleString('tr-TR')}₺
                      </Text>
                    </View>
                    {token ? (
                      bookingSuccess ? (
                        <Animated.View
                          style={[styles.successBox, { transform: [{ scale: successAnim }] }]}
                        >
                          <Text style={styles.successIcon}>🎉</Text>
                          <Text style={styles.successTitle}>Rezervasyon Oluşturuldu!</Text>
                          <Text style={styles.successSubtitle}>
                            Detaylar bildirimlerinizde görünecek.
                          </Text>
                        </Animated.View>
                      ) : (
                        <Pressable
                          style={styles.modalConfirmBtn}
                          onPress={confirmBooking}
                          disabled={booking}
                        >
                          <Text style={styles.modalConfirmTxt}>
                            {booking ? 'Yönlendiriliyor...' : '💳 Kapora Öde'}
                          </Text>
                        </Pressable>
                      )
                    ) : (
                      <GuestCheckout
                        slotId={selectedSlotId!}
                        subdomain={subdomain}
                        addons={Object.entries(selectedAddons)
                          .filter(([, qty]) => qty > 0)
                          .map(([addonId, quantity]) => ({ addonId, quantity }))}
                        onClose={() => setSelectedSlotId(null)}
                      />
                    )}
                  </>
                );
              })()}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  dateRow: { marginBottom: 16, paddingHorizontal: 16 },
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
  // Recommended
  recommendedSection: { paddingHorizontal: 20, marginBottom: 20 },
  recommendedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: premium.accentBlue,
    marginBottom: 10,
  },
  recommendedCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    backgroundColor: 'rgba(16,185,129,0.06)',
    marginBottom: 8,
    transform: [{ scale: 1 }],
  },
  recommendedLeft: {},
  recommendedTime: { fontSize: 16, fontWeight: '800', color: premium.text },
  recommendedName: { fontSize: 12, color: premium.textMuted, marginTop: 2 },
  recommendedBadge: { fontSize: 10, color: '#fbbf24', fontWeight: '700', marginTop: 3 },
  recommendedRight: { alignItems: 'flex-end' },
  recommendedPrice: { fontSize: 16, fontWeight: '900', color: premium.accentGreen },
  recommendedCta: { fontSize: 11, color: premium.accentGreen, fontWeight: '700', marginTop: 2 },
  loginHint: { color: premium.textMuted, fontSize: 12, marginTop: 4 },
  // Grid
  gridSection: { marginBottom: 16 },
  gridTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: premium.text,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  gridTimeCell: { width: 90, paddingVertical: 8, paddingHorizontal: 4 },
  gridTimeTxt: { fontSize: 11, color: premium.text, fontWeight: '700' },
  gridProviderCell: { width: 60, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 2 },
  gridProviderTxt: {
    fontSize: 10,
    color: premium.accentBlue,
    fontWeight: '700',
    textAlign: 'center',
  },
  gridProviderCapacity: {
    fontSize: 9,
    color: premium.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
  },
  gridHeaderTxt: { fontSize: 10, color: premium.textMuted, fontWeight: '700' },
  gridCell: {
    width: 60,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    transform: [{ scale: 1 }],
  },
  gridCellAvailable: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
  },
  gridCellBooked: { backgroundColor: 'rgba(100,116,139,0.1)' },
  gridCellPast: { backgroundColor: 'rgba(0,0,0,0.1)' },
  gridCellTxt: { fontSize: 11, color: premium.textMuted, fontWeight: '700' },
  gridCellTxtAvailable: { color: '#10b981' },
  noSlots: { color: premium.textMuted, textAlign: 'center', padding: 16, fontSize: 13 },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0b1220',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: premium.text, marginBottom: 12 },
  modalSlotInfo: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    marginBottom: 12,
  },
  modalSlotTime: { fontSize: 16, fontWeight: '800', color: premium.text },
  modalSlotName: { fontSize: 12, color: premium.textMuted, marginTop: 1 },
  modalSlotPrice: { fontSize: 14, fontWeight: '800', color: premium.accentGreen, marginTop: 2 },
  modalAddonSection: { marginBottom: 10 },
  modalAddonTitle: { fontSize: 13, fontWeight: '700', color: premium.text, marginBottom: 8 },
  modalAddonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: premium.glassBorder,
  },
  modalAddonName: { fontSize: 13, fontWeight: '600', color: premium.text },
  modalAddonPrice: { fontSize: 11, color: premium.accentBlue, fontWeight: '700', marginTop: 1 },
  modalQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalQtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalQtyBtnTxt: { color: premium.text, fontSize: 16, fontWeight: '700' },
  modalQtyNum: {
    color: premium.text,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 18,
    textAlign: 'center',
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: premium.glassBorder,
    marginBottom: 4,
  },
  modalTotalLabel: { fontSize: 14, fontWeight: '700', color: premium.text },
  modalTotalPrice: { fontSize: 20, fontWeight: '900', color: premium.accentGreen },
  modalKaporaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    marginBottom: 12,
  },
  modalKaporaLabel: { fontSize: 13, fontWeight: '700', color: '#a5b4fc' },
  modalKaporaPrice: { fontSize: 18, fontWeight: '900', color: '#a5b4fc' },
  modalConfirmBtn: {
    backgroundColor: premium.accentGreen,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalConfirmTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  successBox: { alignItems: 'center', paddingVertical: 24 },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 18, fontWeight: '800', color: premium.accentGreen, marginBottom: 4 },
  successSubtitle: { fontSize: 13, color: premium.textMuted },
  modalLoginMsg: { color: premium.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 14 },
  modalLoginRow: { flexDirection: 'row', gap: 10 },
  modalLoginBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalLoginBtnTxt: { color: premium.text, fontSize: 16, fontWeight: '800' },
});
