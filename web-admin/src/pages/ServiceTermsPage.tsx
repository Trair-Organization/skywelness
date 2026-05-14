import { Link } from 'react-router-dom';

export function ServiceTermsPage() {
  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link to="/" className="public-nav-brand">
          <img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" />
          <img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" />
        </Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <Link to="/login" className="public-nav-login">Giriş Yap</Link>
        </div>
      </nav>

      <div className="legal-container">
        <h1>Hizmet Kullanım Sözleşmesi & Rezervasyon Kuralları</h1>
        <p className="legal-updated">Son güncelleme: 14 Mayıs 2026</p>

        <section>
          <h2>1. Genel</h2>
          <p>Bu sözleşme, Wellness Club platformu üzerinden yapılan tüm hizmet rezervasyonları (kişisel antrenman, masaj, kort kiralama, grup dersleri vb.) için geçerlidir. Rezervasyon yaparak bu kuralları kabul etmiş sayılırsınız.</p>
        </section>

        <section>
          <h2>2. Rezervasyon Kuralları</h2>
          <ul>
            <li>Rezervasyon, ödeme tamamlandığında kesinleşir.</li>
            <li>Rezervasyon saatinde ilgili tesiste hazır bulunulmalıdır.</li>
            <li>10 dakikadan fazla gecikme durumunda hizmet sağlayıcı rezervasyonu iptal edebilir.</li>
            <li>Rezervasyon bilgileri (tarih, saat, hizmet) e-posta ile onaylanır.</li>
            <li>Hizmet sağlayıcının mücbir sebeplerle iptal etmesi durumunda tam iade yapılır.</li>
          </ul>
        </section>

        <section>
          <h2>3. İptal ve İade Politikası</h2>
          <ul>
            <li><strong>3 saat öncesine kadar iptal:</strong> %100 iade (tam iade)</li>
            <li><strong>3 saatten az kala iptal:</strong> İade yapılmaz</li>
            <li><strong>Gelmeme (no-show):</strong> İade yapılmaz</li>
            <li><strong>Hizmet sağlayıcı iptali:</strong> %100 iade + bildirim</li>
          </ul>
          <p>İade talepleri otomatik olarak işlenir ve ödeme yönteminize 5-10 iş günü içinde yansır.</p>
        </section>

        <section>
          <h2>4. Kort Kiralama Kuralları</h2>
          <ul>
            <li>Kort süresi rezervasyon saatinde başlar ve biter. Uzatma garantisi yoktur.</li>
            <li>Kort kapasitesine uygun sayıda oyuncu kabul edilir.</li>
            <li>Ekipman (raket, top) kiralama opsiyoneldir ve ayrıca ücretlendirilir.</li>
            <li>Kort ve ekipman hasarından kullanıcı sorumludur.</li>
            <li>Uygun spor kıyafeti ve ayakkabı zorunludur.</li>
          </ul>
        </section>

        <section>
          <h2>5. Kişisel Antrenman (PT) Kuralları</h2>
          <ul>
            <li>PT seansları birebir veya belirtilen kapasite ile gerçekleşir.</li>
            <li>Eğitmen değişikliği kulüp yönetimi tarafından yapılabilir.</li>
            <li>Sağlık durumunuzla ilgili eğitmeninizi bilgilendirmeniz zorunludur.</li>
            <li>Paket satın alımlarında paket süresi içinde kullanım zorunludur.</li>
          </ul>
        </section>

        <section>
          <h2>6. Masaj Hizmeti Kuralları</h2>
          <ul>
            <li>Masaj seansları belirtilen sürede gerçekleşir.</li>
            <li>Sağlık durumunuz (alerji, hamilelik, kronik rahatsızlık) hakkında bilgi vermeniz zorunludur.</li>
            <li>Masöz değişikliği müsaitlik durumuna göre yapılabilir.</li>
          </ul>
        </section>

        <section>
          <h2>7. Ödeme</h2>
          <ul>
            <li>Ödemeler Stripe güvenli ödeme altyapısı üzerinden işlenir.</li>
            <li>Kart bilgileriniz Wellness Club tarafından saklanmaz.</li>
            <li>Fiyatlar TL (Türk Lirası) cinsindendir ve KDV dahildir.</li>
            <li>Misafir ödemelerde e-posta adresi zorunludur (bilet gönderimi için).</li>
          </ul>
        </section>

        <section>
          <h2>8. Sorumluluk</h2>
          <ul>
            <li>Platform, hizmet kalitesinden doğrudan sorumlu değildir.</li>
            <li>Hizmet sağlayıcı (kulüp/eğitmen) ile kullanıcı arasındaki anlaşmazlıklarda platform arabuluculuk yapabilir.</li>
            <li>Kişisel eşya kaybından tesis sorumlu değildir.</li>
          </ul>
        </section>

        <section>
          <h2>9. İletişim</h2>
          <p><strong>E-posta:</strong> info@wellnessclub.com</p>
          <p><strong>Instagram:</strong> @wellnessclub.tr</p>
        </section>
      </div>

      <footer className="public-footer">
        <div className="public-footer-links">
          <Link to="/">Ana Sayfa</Link>
          <Link to="/privacy">Gizlilik Sözleşmesi</Link>
          <Link to="/terms">Kullanım Şartları</Link>
        </div>
        <p className="public-footer-copy">© 2025 Wellness Club. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}
