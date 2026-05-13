import { Link } from 'react-router-dom';

export function MarketingPrivacyPage() {
  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link to="/" className="public-nav-brand"><img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" /></Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <Link to="/login" className="public-nav-login">Giriş Yap</Link>
        </div>
      </nav>

      <div className="legal-container">
        <h1>Gizlilik Sözleşmesi</h1>
        <p className="legal-updated">Son güncelleme: 1 Ocak 2025</p>

        <section>
          <h2>1. Giriş</h2>
          <p>Wellness Club ("Şirket", "biz") olarak kişisel verilerinizin korunmasına büyük önem veriyoruz. Bu Gizlilik Sözleşmesi, platformumuz üzerinden toplanan kişisel verilerin nasıl işlendiğini, saklandığını ve korunduğunu açıklamaktadır.</p>
        </section>

        <section>
          <h2>2. Toplanan Veriler</h2>
          <p>Hizmetlerimizi sunabilmek için aşağıdaki kişisel verileri topluyoruz:</p>
          <ul>
            <li><strong>Kimlik Bilgileri:</strong> Ad, soyad, kullanıcı adı, profil fotoğrafı</li>
            <li><strong>İletişim Bilgileri:</strong> E-posta adresi, telefon numarası</li>
            <li><strong>Hesap Bilgileri:</strong> Şifre (şifrelenmiş), hesap durumu, üyelik bilgileri</li>
            <li><strong>Kullanım Verileri:</strong> Rezervasyon geçmişi, etkinlik katılımları, paket bilgileri</li>
            <li><strong>Teknik Veriler:</strong> IP adresi, cihaz bilgisi, tarayıcı türü</li>
            <li><strong>Konum Bilgileri:</strong> Şehir bilgisi (kulüp eşleştirmesi için)</li>
          </ul>
        </section>

        <section>
          <h2>3. Verilerin Kullanım Amaçları</h2>
          <ul>
            <li>Hesap oluşturma ve kimlik doğrulama</li>
            <li>Rezervasyon ve randevu yönetimi</li>
            <li>Kulüp ve eğitmen eşleştirmesi</li>
            <li>Bildirim ve iletişim hizmetleri</li>
            <li>Platform güvenliği ve dolandırıcılık önleme</li>
            <li>Hizmet kalitesinin iyileştirilmesi</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          </ul>
        </section>

        <section>
          <h2>4. Verilerin Paylaşımı</h2>
          <p>Kişisel verileriniz aşağıdaki durumlar dışında üçüncü taraflarla paylaşılmaz:</p>
          <ul>
            <li>Üye olduğunuz kulüp yöneticileri (üyelik yönetimi için)</li>
            <li>Randevu aldığınız eğitmenler (hizmet sunumu için)</li>
            <li>Yasal zorunluluklar (mahkeme kararı, resmi talep)</li>
            <li>Altyapı hizmet sağlayıcıları (sunucu, e-posta — veri işleme sözleşmesi kapsamında)</li>
          </ul>
        </section>

        <section>
          <h2>5. Veri Güvenliği</h2>
          <p>Verilerinizi korumak için endüstri standardı güvenlik önlemleri uyguluyoruz:</p>
          <ul>
            <li>SSL/TLS şifreleme (aktarım sırasında)</li>
            <li>Şifrelerin bcrypt ile hash'lenmesi</li>
            <li>Erişim kontrolü ve yetkilendirme sistemi</li>
            <li>Düzenli güvenlik güncellemeleri</li>
            <li>Veri yedekleme ve felaket kurtarma planları</li>
          </ul>
        </section>

        <section>
          <h2>6. Haklarınız (KVKK Kapsamında)</h2>
          <p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aşağıdaki haklara sahipsiniz:</p>
          <ul>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme</li>
            <li>Verilerin silinmesini veya yok edilmesini isteme</li>
            <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
          </ul>
        </section>

        <section>
          <h2>7. Çerezler</h2>
          <p>Platformumuz, oturum yönetimi ve kullanıcı deneyimini iyileştirmek amacıyla çerezler kullanmaktadır. Zorunlu çerezler hizmetin çalışması için gereklidir.</p>
        </section>

        <section>
          <h2>8. Veri Saklama Süresi</h2>
          <p>Kişisel verileriniz, hizmet ilişkisi devam ettiği sürece ve yasal saklama yükümlülükleri kapsamında saklanır. Hesap silme talebiniz üzerine verileriniz 30 gün içinde kalıcı olarak silinir.</p>
        </section>

        <section>
          <h2>9. İletişim</h2>
          <p>Gizlilik ile ilgili sorularınız için:</p>
          <p><strong>E-posta:</strong> info@wellnessclub.com</p>
          <p><strong>Instagram:</strong> @wellnessclub.tr</p>
        </section>
      </div>

      <footer className="public-footer">
        <div className="public-footer-links">
          <Link to="/">Ana Sayfa</Link>
          <Link to="/terms">Kullanım Şartları</Link>
          <Link to="/contact">İletişim</Link>
        </div>
        <p className="public-footer-copy">© 2025 Wellness Club. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}
