import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/**
 * Eğitmen başvurusu PENDING ya da REJECTED ise gösterilen sayfa.
 * Kullanıcı paneli kullanmak yerine durumu görür.
 */
export function TrainerApplicationStatusPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const status = user?.accountStatus ?? 'pending_approval';
  const isRejected = status === 'rejected';
  const isPending = status === 'pending_approval';

  return (
    <div className="shell narrow trainer-app-status">
      <div className="trainer-app-card">
        {isPending && (
          <>
            <div className="trainer-app-icon" aria-hidden="true">
              ⏳
            </div>
            <h1>Başvurunuz İnceleniyor</h1>
            <p>
              Eğitmen başvurunuz platform ekibimize ulaştı. Profil bilgileri ve sertifikaların
              doğrulanması genellikle <strong>1-3 iş günü</strong> içinde tamamlanır.
            </p>
            <p className="muted">
              Onaylandığında size hem e-posta hem mobil bildirim geleceğiz. Onaylandıktan sonra
              eğitmen panelinize giriş yapabilir, slotlarınızı oluşturup öğrencilerinizle
              buluşmaya başlayabilirsiniz.
            </p>
            <div className="trainer-app-tips">
              <h3>Bu sırada hazır olun:</h3>
              <ul>
                <li>Profil fotoğrafı ekleyebileceğiniz kare formatlı (en az 400×400 px) bir görsel hazırlayın</li>
                <li>Sertifika ve eğitim belgelerinizi PDF veya görsel olarak hazırlayın</li>
                <li>Hizmet paketlerinizi ve fiyatlandırmanızı planlayın</li>
              </ul>
            </div>
          </>
        )}
        {isRejected && (
          <>
            <div className="trainer-app-icon trainer-app-icon-reject" aria-hidden="true">
              ⚠️
            </div>
            <h1>Başvurunuz Şu Anda Onaylanamadı</h1>
            <p>
              Maalesef eğitmen başvurunuz şu an için onaylanmamıştır. Sertifikalarınızı
              güncelleyip tekrar başvurabilirsiniz.
            </p>
            <p className="muted">
              Sebebi öğrenmek ve süreci tartışmak için bizimle iletişime geçebilirsiniz.
            </p>
          </>
        )}
        <div className="trainer-app-actions">
          <Link to="/" className="btn-outline">
            ← Ana Sayfaya Dön
          </Link>
          <a href="mailto:info@wellnessclub.tech" className="btn-outline">
            ✉️ İletişim
          </a>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
}
