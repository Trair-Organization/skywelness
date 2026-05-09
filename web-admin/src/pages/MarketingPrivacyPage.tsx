import { Link } from 'react-router-dom';
import { MarketingFooter } from '../components/MarketingFooter';

export function MarketingPrivacyPage() {
  return (
    <div className="shell marketing">
      <header className="topbar">
        <h1>Gizlilik Politikası</h1>
        <Link className="secondary" to="/">
          Ana sayfaya dön
        </Link>
      </header>

      <section className="card legal">
        <p className="legal-meta">Son güncelleme: 9 Mayıs 2026 · TrairX Technology OÜ</p>

        <h2>1. Giriş</h2>
        <p>
          Bu Gizlilik Politikası, TrairX Technology OÜ ("Şirket", "biz") tarafından işletilen
          Wellness Club mobil uygulaması ve web platformu ("Hizmet") aracılığıyla toplanan, işlenen
          ve saklanan kişisel verilere ilişkin uygulamaları açıklar. Hizmeti kullanarak bu
          politikayı kabul etmiş sayılırsınız.
        </p>

        <h2>2. Veri Sorumlusu</h2>
        <p>
          <strong>TrairX Technology OÜ</strong>
          <br />
          Kayıt No: 16933857
          <br />
          Adres: Harju maakond, Tallinn, Kesklinna linnaosa, Ahtri tn 12, 10151, Estonya
          <br />
          E-posta: privacy@trairx.com
        </p>

        <h2>3. Toplanan Kişisel Veriler</h2>
        <p>Hizmetimizi kullanırken aşağıdaki kategorilerde kişisel veri toplanabilir:</p>
        <ul>
          <li>
            <strong>Kimlik bilgileri:</strong> Ad, soyad, kullanıcı adı, profil fotoğrafı
          </li>
          <li>
            <strong>İletişim bilgileri:</strong> E-posta adresi, telefon numarası
          </li>
          <li>
            <strong>Hesap bilgileri:</strong> Şifre (hash'lenmiş), oturum tokenları
          </li>
          <li>
            <strong>Kullanım verileri:</strong> Rezervasyon geçmişi, paket bilgileri, etkinlik
            katılımları
          </li>
          <li>
            <strong>Cihaz bilgileri:</strong> Cihaz modeli, işletim sistemi, push notification token
          </li>
          <li>
            <strong>Konum bilgileri:</strong> Yalnızca kullanıcı izni ile ve kulüp yakınlık tespiti
            amacıyla
          </li>
        </ul>

        <h2>4. Verilerin İşlenme Amaçları</h2>
        <p>Kişisel verileriniz aşağıdaki amaçlarla işlenir:</p>
        <ul>
          <li>Hesap oluşturma ve kimlik doğrulama</li>
          <li>Rezervasyon, paket ve üyelik yönetimi</li>
          <li>Kulüp ve eğitmen ile iletişim (mesajlaşma)</li>
          <li>Push bildirim gönderimi (izniniz dahilinde)</li>
          <li>Hizmet kalitesinin iyileştirilmesi ve analitik</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi</li>
        </ul>

        <h2>5. Verilerin Paylaşımı</h2>
        <p>Kişisel verileriniz aşağıdaki durumlar dışında üçüncü taraflarla paylaşılmaz:</p>
        <ul>
          <li>
            <strong>Kulüp yöneticileri:</strong> Üyelik onayı ve hizmet sunumu için gerekli minimum
            bilgi
          </li>
          <li>
            <strong>Eğitmenler:</strong> Rezervasyon ve seans yönetimi kapsamında ad ve iletişim
            bilgisi
          </li>
          <li>
            <strong>Altyapı sağlayıcıları:</strong> Sunucu (Hetzner), e-posta (SMTP/Resend),
            bildirim (Expo) hizmetleri
          </li>
          <li>
            <strong>Yasal zorunluluk:</strong> Mahkeme kararı veya yetkili makam talebi halinde
          </li>
        </ul>
        <p>
          Kişisel verileriniz hiçbir koşulda satılmaz veya reklam amacıyla üçüncü taraflara
          aktarılmaz.
        </p>

        <h2>6. Veri Saklama Süresi</h2>
        <p>
          Kişisel verileriniz, hesabınız aktif olduğu sürece saklanır. Hesap silme talebiniz üzerine
          verileriniz 30 gün içinde kalıcı olarak silinir. Yasal saklama yükümlülükleri saklıdır.
        </p>

        <h2>7. Veri Güvenliği</h2>
        <p>
          Verilerinizin güvenliği için endüstri standardı önlemler uygulanır: şifreler bcrypt ile
          hash'lenir, iletişim TLS/HTTPS ile şifrelenir, erişim JWT token tabanlı yetkilendirme ile
          kontrol edilir, sunucular güvenlik duvarı ve düzenli güncelleme ile korunur.
        </p>

        <h2>8. Kullanıcı Hakları</h2>
        <p>GDPR ve KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Verilerinize erişim talep etme</li>
          <li>Verilerin düzeltilmesini isteme</li>
          <li>Verilerin silinmesini talep etme (hesap silme)</li>
          <li>Veri işlemeye itiraz etme</li>
          <li>Veri taşınabilirliği talep etme</li>
          <li>Açık rızanızı geri çekme</li>
        </ul>
        <p>
          Bu haklarınızı kullanmak için <strong>privacy@trairx.com</strong> adresine
          başvurabilirsiniz.
        </p>

        <h2>9. Çerezler ve İzleme</h2>
        <p>
          Mobil uygulamamız çerez kullanmaz. Web platformumuz yalnızca oturum yönetimi için gerekli
          teknik çerezler (localStorage) kullanır. Üçüncü taraf izleme araçları kullanılmamaktadır.
        </p>

        <h2>10. Çocukların Gizliliği</h2>
        <p>
          Hizmetimiz 16 yaşın altındaki bireylere yönelik değildir. 16 yaşın altındaki bir bireyin
          verilerinin toplandığını fark edersek, bu verileri derhal sileriz.
        </p>

        <h2>11. Politika Değişiklikleri</h2>
        <p>
          Bu politika zaman zaman güncellenebilir. Önemli değişiklikler uygulama içi bildirim veya
          e-posta yoluyla duyurulur. Güncel versiyon her zaman bu sayfada yayınlanır.
        </p>

        <h2>12. İletişim</h2>
        <p>
          Gizlilik ile ilgili tüm soru ve talepleriniz için:
          <br />
          <strong>TrairX Technology OÜ</strong>
          <br />
          E-posta: privacy@trairx.com
          <br />
          Web: www.trairx.com
        </p>
      </section>

      <MarketingFooter />
    </div>
  );
}
