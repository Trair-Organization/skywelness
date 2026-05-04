export default {
  lang: { label: 'Language', tr: 'Türkçe', en: 'English' },
  login: {
    title: 'Wellness Club admin',
    subtitle: 'Sign in with your club code and administrator account.',
    tenant: 'Club code (subdomain)',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    pending: 'Signing in…',
    error: 'Sign-in failed',
  },
  dashboard: {
    title: 'Dashboard',
    apiCheck: 'API check',
    apiCheckDesc: 'Protected GET /admin/ping call.',
    ping: 'Admin ping',
    signOut: 'Sign out',
  },
  protected: {
    loading: 'Loading…',
    deniedTitle: 'Access denied',
    deniedBody:
      'This panel is for <strong>administrator</strong> accounts only. Members and trainers should use the mobile app.',
    signOut: 'Sign out',
  },
} as const;
