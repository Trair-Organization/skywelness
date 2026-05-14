import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function BookingSuccessPage() {
  useEffect(() => {
    // Deep link ile uygulamaya yönlendir
    const timer = setTimeout(() => {
      window.location.href = 'wellnessclubai://booking-success';
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link to="/" className="public-nav-brand">
          <img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" />
          <img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" />
        </Link>
      </nav>
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎉</div>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', marginBottom: '0.75rem' }}>Rezervasyon Başarılı!</h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Ödemeniz alındı ve rezervasyonunuz oluşturuldu. Detaylar e-posta adresinize gönderilecektir.
        </p>
        <div style={{ padding: '1.25rem', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: '2rem' }}>
          <p style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
            ✓ Ödeme onaylandı<br />
            ✓ Rezervasyon oluşturuldu<br />
            ✓ E-posta bileti gönderildi
          </p>
        </div>
        <Link to="/discover" className="btn-primary" style={{ marginRight: '1rem' }}>Ana Sayfaya Dön</Link>
        <Link to="/register" className="btn-outline">Hesap Oluştur</Link>
      </div>
    </div>
  );
}
