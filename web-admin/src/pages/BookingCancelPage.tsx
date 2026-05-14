import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function BookingCancelPage() {
  useEffect(() => {
    // Deep link ile uygulamaya yönlendir
    const timer = setTimeout(() => {
      window.location.href = 'wellnessclubai://booking-cancel';
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
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>↩️</div>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', marginBottom: '0.75rem' }}>Ödeme İptal Edildi</h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Ödeme işlemi tamamlanmadı. Herhangi bir ücret alınmadı. Dilediğiniz zaman tekrar deneyebilirsiniz.
        </p>
        <Link to="/discover" className="btn-primary">Keşfetmeye Devam Et</Link>
      </div>
    </div>
  );
}
