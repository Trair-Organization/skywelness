import { Link } from 'react-router-dom';

export function MarketingTermsPage() {
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
        <h1>Kullanım Şartları</h1>
        <p className="legal-updated">Son güncelleme: 1 Ocak 2025</p>

        <section>
          <h2>1. Genel Hükümler</h2>
          <p>Bu Kullanım Şartları, Wellness Club platformunu ("Platform") kullanan tüm kullanıcılar, partnerler ve eğitmenler için geçerlidir. Platformu kullanarak bu şartları kabul etmiş sayılırsınız.</p>
        </section>

        <section>
          <h2>2. Hizmet Tanımı</h2>
          <p>Wellness Club, spor kulüpleri, wellness merkezleri, eğitmenler ve üyeler arasında dijital bağlantı kuran bir platformdur. Sunulan hizmetler:</p>
          <ul>
            <li>Kulüp keşfi ve üyelik yönetimi</li>
            <li>Online rezervasyon ve randevu sistemi</li>
            <li>Eğitmen-üye eşleştirmesi</li>
            <li>Etkinlik yönetimi ve katılım</li>
            <li>Mesajlaşma ve iletişim</li>
            <li>Dijital paket ve ödeme yönetimi</li>
          </ul>
        </section>

        <section>
          <h2>3. Hesap Oluşturma ve Güvenlik</h2>
          <ul>
            <li>Kayıt sırasında doğru ve güncel bilgi vermekle yükümlüsünüz.</li>
            <li>Hesap güvenliğinden siz sorumlusunuz. Şifrenizi kimseyle paylaşmayın.</li>
            <li>Hesabınızda yetkisiz erişim tespit ederseniz derhal bize bildirin.</li>
            <li>18 yaşından küçükler veli/vasi onayı olmadan hesap oluşturamaz.</li>
          </ul>
        </section>

        <section>
          <h2>4. Kullanıcı Yükümlülükleri</h2>
          <ul>
            <li>Platformu yasalara uygun şekilde kullanmak</li>
            <li>Diğer kullanıcılara saygılı davranmak</li>
            <li>Yanıltıcı veya sahte bilgi paylaşmamak</li>
            <li>Platformun teknik altyapısına zarar vermemek</li>
            <li>Spam, reklam veya istenmeyen içerik paylaşmamak</li>
            <li>Başkalarının kişisel verilerini izinsiz paylaşmamak</li>
          </ul>
        </section>

        <section>
          <h2>5. Partner ve Eğitmen Yükümlülükleri</h2>
          <ul>
            <li>Sunulan hizmetlerin doğru ve güncel tanımlanması</li>
            <li>Rezervasyonlara zamanında yanıt verilmesi</li>
            <li>Üye bilgilerinin gizliliğinin korunması</li>
            <li>Geçerli sertifika ve lisansların bulundurulması (eğitmenler için)</li>
            <li>Platform kurallarına ve etik standartlara uyulması</li>
          </ul>
        </section>

        <section>
          <h2>6. Rezervasyon ve İptal Politikası</h2>
          <ul>
            <li>Rezervasyonlar kulüp/eğitmen onayına tabidir.</li>
            <li>İptal koşulları ilgili kulüp/eğitmen tarafından belirlenir.</li>
            <li>No-show (gelmeme) durumunda kulüp politikası uygulanır.</li>
            <li>Platform, kulüp-üye arasındaki anlaşmazlıklarda arabuluculuk yapabilir.</li>
          </ul>
        </section>

        <section>
          <h2>7. Fikri Mülkiyet</h2>
          <p>Platform üzerindeki tüm içerik, tasarım, logo, yazılım ve marka unsurları Wellness Club'a aittir. İzinsiz kopyalama, dağıtma veya ticari kullanım yasaktır.</p>
        </section>

        <section>
          <h2>8. Sorumluluk Sınırlaması</h2>
          <ul>
            <li>Platform, kulüpler ve eğitmenler tarafından sunulan hizmetlerin kalitesinden doğrudan sorumlu değildir.</li>
            <li>Kullanıcılar arası anlaşmazlıklarda platform arabuluculuk rolü üstlenebilir ancak taraf değildir.</li>
            <li>Teknik arızalar, bakım çalışmaları veya mücbir sebepler nedeniyle oluşabilecek kesintilerden sorumluluk kabul edilmez.</li>
          </ul>
        </section>

        <section>
          <h2>9. Hesap Askıya Alma ve Sonlandırma</h2>
          <p>Aşağıdaki durumlarda hesabınız askıya alınabilir veya sonlandırılabilir:</p>
          <ul>
            <li>Kullanım şartlarının ihlali</li>
            <li>Sahte veya yanıltıcı bilgi kullanımı</li>
            <li>Diğer kullanıcılara yönelik taciz veya uygunsuz davranış</li>
            <li>Platform güvenliğini tehdit eden faaliyetler</li>
          </ul>
        </section>

        <section>
          <h2>10. Değişiklikler</h2>
          <p>Bu Kullanım Şartları zaman zaman güncellenebilir. Önemli değişiklikler e-posta veya platform bildirimi ile duyurulur. Güncelleme sonrası platformu kullanmaya devam etmeniz, yeni şartları kabul ettiğiniz anlamına gelir.</p>
        </section>

        <section>
          <h2>11. Uygulanacak Hukuk</h2>
          <p>Bu sözleşme Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.</p>
        </section>

        <section>
          <h2>12. İletişim</h2>
          <p><strong>E-posta:</strong> info@wellnessclub.com</p>
          <p><strong>Instagram:</strong> @wellnessclub.tr</p>
        </section>
      </div>

      <footer className="public-footer">
        <div className="public-footer-links">
          <Link to="/">Ana Sayfa</Link>
          <Link to="/privacy">Gizlilik Sözleşmesi</Link>
          <Link to="/contact">İletişim</Link>
        </div>
        <p className="public-footer-copy">© 2025 Wellness Club. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}
