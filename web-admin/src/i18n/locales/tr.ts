export default {
  lang: { label: 'Dil', tr: 'Türkçe', en: 'English' },
  login: {
    title: 'Wellness Club yönetim',
    subtitle: 'Kulüp kodunuz ve yönetici hesabınızla giriş yapın.',
    tenant: 'Kulüp kodu (subdomain)',
    email: 'E-posta',
    password: 'Şifre',
    submit: 'Giriş yap',
    pending: 'Giriş…',
    error: 'Giriş başarısız',
  },
  dashboard: {
    title: 'Panel',
    apiCheck: 'API doğrulama',
    apiCheckDesc: 'Korumalı GET /admin/ping çağrısı.',
    ping: 'Admin ping',
    signOut: 'Çıkış',
  },
  protected: {
    loading: 'Yükleniyor…',
    deniedTitle: 'Erişim yok',
    deniedBody:
      'Bu panel yalnızca <strong>yönetici</strong> hesapları içindir. Üye veya eğitmen hesabıyla mobil uygulamayı kullanın.',
    signOut: 'Oturumu kapat',
  },
} as const;
