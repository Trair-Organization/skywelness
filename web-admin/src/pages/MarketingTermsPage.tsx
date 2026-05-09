import { Link } from 'react-router-dom';
import { MarketingFooter } from '../components/MarketingFooter';

export function MarketingTermsPage() {
  return (
    <div className="shell marketing">
      <header className="topbar">
        <h1>Kullanım Şartları</h1>
        <Link className="secondary" to="/">
          Ana sayfaya dön
        </Link>
      </header>

      <section className="card legal">
        <p className="legal-meta">Son güncelleme: 9 Mayıs 2026 · TrairX Technology OÜ</p>

        <h2>1. Taraflar ve Kapsam</h2>
        <p>
          Bu Kullanım Şartları ("Sözleşme"), TrairX Technology OÜ ("Şirket", kayıt no: 16933857,
          Harju maakond, Tallinn, Estonya) tarafından işletilen Wellness Club mobil uygulaması ve
          web platformu ("Hizmet") ile bu Hizmeti kullanan gerçek veya tüzel kişiler ("Kullanıcı")
          arasındaki hukuki ilişkiyi düzenler.
        </p>
        <p>
          Hizmete kayıt olarak veya Hizmeti kullanarak bu Sözleşme'nin tüm hükümlerini kabul etmiş
          sayılırsınız.
        </p>

        <h2>2. Hizmet Tanımı</h2>
        <p>
          Wellness Club, aşağıdaki hizmetleri sunan bir fitness ve wellness marketplace
          platformudur:
        </p>
        <ul>
          <li>Fitness kulüplerinin keşfi ve üyelik yönetimi</li>
          <li>Eğitmen ve terapist ile randevu/rezervasyon sistemi</li>
          <li>Paket satın alma ve seans takibi</li>
          <li>Kulüp etkinliklerine katılım</li>
          <li>Kulüp ve eğitmenlerle mesajlaşma</li>
          <li>Cafe sipariş hizmeti (kulüp bünyesinde)</li>
          <li>Kampanya ve indirim fırsatları</li>
        </ul>

        <h2>3. Hesap Oluşturma ve Güvenlik</h2>
        <ul>
          <li>Kullanıcı, kayıt sırasında doğru ve güncel bilgi vermekle yükümlüdür.</li>
          <li>Her kullanıcı yalnızca bir hesap oluşturabilir.</li>
          <li>Hesap güvenliği kullanıcının sorumluluğundadır; şifre paylaşılmamalıdır.</li>
          <li>Şüpheli aktivite tespit edilmesi halinde hesap geçici olarak askıya alınabilir.</li>
          <li>Kullanıcı, hesabını istediği zaman uygulama içinden silebilir.</li>
        </ul>

        <h2>4. Kullanıcı Yükümlülükleri</h2>
        <p>Kullanıcı, Hizmeti kullanırken aşağıdaki kurallara uymayı kabul eder:</p>
        <ul>
          <li>Platformu yürürlükteki yasalara uygun şekilde kullanmak</li>
          <li>Diğer kullanıcıların haklarına saygı göstermek</li>
          <li>Spam, yanıltıcı içerik veya kötü amaçlı yazılım paylaşmamak</li>
          <li>Platformun teknik altyapısına zarar verecek eylemlerden kaçınmak</li>
          <li>Başkalarının hesap bilgilerini kullanmamak</li>
          <li>Mesajlaşma özelliğini ticari spam veya taciz amacıyla kullanmamak</li>
        </ul>

        <h2>5. Kulüp ve Eğitmen İlişkisi</h2>
        <p>
          Wellness Club, kulüpler ve eğitmenler ile kullanıcılar arasında bir aracı platform
          konumundadır. Kulüplerin ve eğitmenlerin sundukları hizmetlerin kalitesi, fiyatlandırması
          ve uygunluğu ilgili kulüp/eğitmenin sorumluluğundadır. Şirket, bu hizmetlerin doğrudan
          sağlayıcısı değildir.
        </p>

        <h2>6. Ödeme ve İade</h2>
        <ul>
          <li>
            Platform üzerinden yapılan paket satın alımları ilgili kulüp tarafından yönetilir.
          </li>
          <li>İade politikası her kulüp tarafından ayrıca belirlenir.</li>
          <li>Şirket, kulüp ile kullanıcı arasındaki mali anlaşmazlıklarda taraf değildir.</li>
          <li>Platform komisyonları kulüp ve eğitmen sözleşmeleri kapsamında tahsil edilir.</li>
        </ul>

        <h2>7. Fikri Mülkiyet</h2>
        <p>
          Wellness Club uygulaması, web platformu, tasarımı, kaynak kodu, logoları ve tüm ilgili
          içerik TrairX Technology OÜ'nün münhasır mülkiyetindedir. Kullanıcılar, Hizmeti yalnızca
          kişisel ve ticari olmayan amaçlarla kullanabilir. İzinsiz kopyalama, dağıtma veya tersine
          mühendislik yasaktır.
        </p>

        <h2>8. Hizmet Değişiklikleri ve Kesintiler</h2>
        <p>
          Şirket, Hizmeti geliştirmek, güncellemek veya bakım yapmak amacıyla zaman zaman değişiklik
          yapabilir veya geçici kesintiler uygulayabilir. Planlı bakımlar önceden duyurulur. Şirket,
          kesintilerden kaynaklanan dolaylı zararlardan sorumlu tutulamaz.
        </p>

        <h2>9. Hesap Askıya Alma ve Fesih</h2>
        <ul>
          <li>Bu Sözleşme'nin ihlali halinde hesap uyarı ile veya doğrudan askıya alınabilir.</li>
          <li>Kullanıcı, hesabını istediği zaman silebilir.</li>
          <li>Hesap silme işlemi geri alınamaz; veriler 30 gün içinde kalıcı olarak silinir.</li>
        </ul>

        <h2>10. Sorumluluk Sınırlaması</h2>
        <p>
          Hizmet "olduğu gibi" sunulur. Şirket, Hizmetin kesintisiz veya hatasız çalışacağını
          garanti etmez. Şirketin toplam sorumluluğu, kullanıcının son 12 ayda ödediği tutarla
          sınırlıdır. Dolaylı, arızi veya cezai zararlardan sorumluluk kabul edilmez.
        </p>

        <h2>11. Uygulanacak Hukuk ve Uyuşmazlık Çözümü</h2>
        <p>
          Bu Sözleşme, Estonya Cumhuriyeti hukukuna tabidir. Taraflar arasındaki uyuşmazlıklar
          öncelikle dostane müzakere yoluyla çözülmeye çalışılır. Çözülemeyen uyuşmazlıklarda Harju
          Maakohus (Harju İlk Derece Mahkemesi, Tallinn) yetkilidir.
        </p>

        <h2>12. Değişiklikler</h2>
        <p>
          Şirket, bu Sözleşme'yi önceden bildirimde bulunarak değiştirme hakkını saklı tutar. Önemli
          değişiklikler en az 14 gün öncesinden uygulama içi bildirim veya e-posta ile duyurulur.
          Değişiklik sonrası Hizmeti kullanmaya devam etmek, yeni şartların kabulü anlamına gelir.
        </p>

        <h2>13. İletişim</h2>
        <p>
          Bu Sözleşme ile ilgili tüm soru ve talepleriniz için:
          <br />
          <strong>TrairX Technology OÜ</strong>
          <br />
          E-posta: legal@trairx.com
          <br />
          Web: www.trairx.com
          <br />
          Adres: Harju maakond, Tallinn, Kesklinna linnaosa, Ahtri tn 12, 10151, Estonya
        </p>
      </section>

      <MarketingFooter />
    </div>
  );
}
