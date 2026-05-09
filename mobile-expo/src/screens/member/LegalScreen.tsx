import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { premium } from '../../theme/premiumTheme';

type LegalRouteParams = {
  Legal: { type: 'privacy' | 'terms' };
};

const PRIVACY_CONTENT = `Son güncelleme: 9 Mayıs 2026 · TrairX Technology OÜ

1. GİRİŞ

Bu Gizlilik Politikası, TrairX Technology OÜ ("Şirket") tarafından işletilen Wellness Club mobil uygulaması ve web platformu ("Hizmet") aracılığıyla toplanan, işlenen ve saklanan kişisel verilere ilişkin uygulamaları açıklar.

2. VERİ SORUMLUSU

TrairX Technology OÜ
Kayıt No: 16933857
Adres: Harju maakond, Tallinn, Kesklinna linnaosa, Ahtri tn 12, 10151, Estonya
E-posta: privacy@trairx.com

3. TOPLANAN KİŞİSEL VERİLER

• Kimlik bilgileri: Ad, soyad, kullanıcı adı, profil fotoğrafı
• İletişim bilgileri: E-posta adresi, telefon numarası
• Hesap bilgileri: Şifre (hash'lenmiş), oturum tokenları
• Kullanım verileri: Rezervasyon geçmişi, paket bilgileri, etkinlik katılımları
• Cihaz bilgileri: Cihaz modeli, işletim sistemi, push notification token

4. VERİLERİN İŞLENME AMAÇLARI

• Hesap oluşturma ve kimlik doğrulama
• Rezervasyon, paket ve üyelik yönetimi
• Kulüp ve eğitmen ile iletişim (mesajlaşma)
• Push bildirim gönderimi (izniniz dahilinde)
• Hizmet kalitesinin iyileştirilmesi

5. VERİLERİN PAYLAŞIMI

Kişisel verileriniz satılmaz. Yalnızca şu durumlarda paylaşılır:
• Kulüp yöneticileri: Üyelik onayı için gerekli minimum bilgi
• Eğitmenler: Rezervasyon yönetimi kapsamında
• Altyapı sağlayıcıları: Sunucu, e-posta, bildirim hizmetleri
• Yasal zorunluluk: Mahkeme kararı halinde

6. VERİ SAKLAMA SÜRESİ

Verileriniz hesabınız aktif olduğu sürece saklanır. Hesap silme talebiniz üzerine 30 gün içinde kalıcı olarak silinir.

7. VERİ GÜVENLİĞİ

Şifreler bcrypt ile hash'lenir, iletişim TLS/HTTPS ile şifrelenir, erişim JWT token tabanlı yetkilendirme ile kontrol edilir.

8. KULLANICI HAKLARI (GDPR/KVKK)

• Verilerinize erişim talep etme
• Verilerin düzeltilmesini isteme
• Verilerin silinmesini talep etme
• Veri işlemeye itiraz etme
• Açık rızanızı geri çekme

Bu haklarınızı kullanmak için privacy@trairx.com adresine başvurabilirsiniz.

9. ÇOCUKLARIN GİZLİLİĞİ

Hizmetimiz 16 yaşın altındaki bireylere yönelik değildir.

10. İLETİŞİM

TrairX Technology OÜ
E-posta: privacy@trairx.com
Web: www.trairx.com`;

const TERMS_CONTENT = `Son güncelleme: 9 Mayıs 2026 · TrairX Technology OÜ

1. TARAFLAR VE KAPSAM

Bu Kullanım Şartları, TrairX Technology OÜ ("Şirket", kayıt no: 16933857, Tallinn, Estonya) tarafından işletilen Wellness Club mobil uygulaması ve web platformu ("Hizmet") ile Kullanıcı arasındaki hukuki ilişkiyi düzenler.

Hizmete kayıt olarak bu Sözleşme'nin tüm hükümlerini kabul etmiş sayılırsınız.

2. HİZMET TANIMI

Wellness Club aşağıdaki hizmetleri sunar:
• Fitness kulüplerinin keşfi ve üyelik yönetimi
• Eğitmen ve terapist ile randevu/rezervasyon
• Paket satın alma ve seans takibi
• Kulüp etkinliklerine katılım
• Kulüp ve eğitmenlerle mesajlaşma
• Cafe sipariş hizmeti
• Kampanya ve indirim fırsatları

3. HESAP GÜVENLİĞİ

• Kayıt sırasında doğru bilgi vermekle yükümlüsünüz
• Her kullanıcı yalnızca bir hesap oluşturabilir
• Hesap güvenliği sizin sorumluluğunuzdadır
• Hesabınızı istediğiniz zaman silebilirsiniz

4. KULLANICI YÜKÜMLÜLÜKLERİ

• Platformu yasalara uygun kullanmak
• Diğer kullanıcıların haklarına saygı göstermek
• Spam veya kötü amaçlı içerik paylaşmamak
• Mesajlaşmayı taciz amacıyla kullanmamak

5. KULÜP VE EĞİTMEN İLİŞKİSİ

Wellness Club bir aracı platformdur. Kulüplerin ve eğitmenlerin sundukları hizmetlerin kalitesi ilgili tarafın sorumluluğundadır.

6. ÖDEME VE İADE

• Paket satın alımları ilgili kulüp tarafından yönetilir
• İade politikası her kulüp tarafından belirlenir
• Platform komisyonları ayrı sözleşmeler kapsamındadır

7. FİKRİ MÜLKİYET

Tüm yazılım, tasarım ve içerik hakları TrairX Technology OÜ'ye aittir. İzinsiz kopyalama yasaktır.

8. SORUMLULUK SINIRLAMASI

Hizmet "olduğu gibi" sunulur. Kesintisiz çalışma garanti edilmez. Dolaylı zararlardan sorumluluk kabul edilmez.

9. HESAP SİLME

• Hesabınızı uygulama içinden silebilirsiniz
• Silme işlemi geri alınamaz
• Veriler 30 gün içinde kalıcı olarak silinir

10. UYGULANACAK HUKUK

Bu Sözleşme Estonya Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda Harju Maakohus yetkilidir.

11. İLETİŞİM

TrairX Technology OÜ
E-posta: legal@trairx.com
Web: www.trairx.com
Adres: Harju maakond, Tallinn, Kesklinna linnaosa, Ahtri tn 12, 10151, Estonya`;

export function LegalScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<LegalRouteParams, 'Legal'>>();
  const type = route.params?.type ?? 'privacy';
  const isPrivacy = type === 'privacy';

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {isPrivacy ? '🔒 Gizlilik Politikası' : '📋 Kullanım Şartları'}
        </Text>
        <View style={styles.card}>
          <Text style={styles.content}>{isPrivacy ? PRIVACY_CONTENT : TERMS_CONTENT}</Text>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: premium.text, marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: premium.radiusMd,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 18,
  },
  content: { color: premium.textMuted, fontSize: 14, lineHeight: 22 },
});
