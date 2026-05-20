/**
 * Badge Service — Otomatik ve manuel badge'leri birleştirir.
 *
 * Manuel badge'ler: tenant.badges / user.badges kolonu (super admin set eder)
 * Otomatik badge'ler: runtime'da hesaplanır (puan, tarih, vb.)
 */

export type BadgeKey =
  // Tier
  | 'elite'
  | 'premium'
  | 'verified'
  | 'new'
  // Performance
  | 'top-rated'
  | 'trending'
  | 'fast-response'
  | 'satisfaction'
  // Trainer
  | 'certified'
  | 'expert'
  | 'top-trainer'
  // Club
  | 'multi-service'
  | 'large-community'
  | 'multi-branch'
  // Special
  | 'has-campaign'
  | 'open-now'
  | 'instant-booking';

export interface BadgeInfo {
  key: BadgeKey;
  label: string;
  icon: string;
  color: string; // CSS variable-friendly hex
  tier: 'tier' | 'performance' | 'trainer' | 'club' | 'special';
}

export const BADGE_DEFINITIONS: Record<BadgeKey, Omit<BadgeInfo, 'key'>> = {
  elite: { label: 'Elit Partner', icon: '💎', color: '#a855f7', tier: 'tier' },
  premium: { label: 'Premium', icon: '⭐', color: '#fbbf24', tier: 'tier' },
  verified: { label: 'Doğrulanmış', icon: '✓', color: '#10b981', tier: 'tier' },
  new: { label: 'Yeni', icon: '🆕', color: '#38bdf8', tier: 'tier' },
  'top-rated': { label: 'En İyi Puan', icon: '🏅', color: '#f59e0b', tier: 'performance' },
  trending: { label: 'Trend', icon: '🔥', color: '#f97316', tier: 'performance' },
  'fast-response': { label: 'Hızlı Yanıt', icon: '⚡', color: '#06b6d4', tier: 'performance' },
  satisfaction: { label: 'Memnuniyet', icon: '🎯', color: '#22c55e', tier: 'performance' },
  certified: { label: 'Sertifikalı', icon: '🎓', color: '#10b981', tier: 'trainer' },
  expert: { label: 'Uzman', icon: '💪', color: '#8b5cf6', tier: 'trainer' },
  'top-trainer': { label: 'Top 10', icon: '🏆', color: '#fbbf24', tier: 'trainer' },
  'multi-service': { label: 'Çok Hizmet', icon: '🌟', color: '#38bdf8', tier: 'club' },
  'large-community': { label: 'Geniş Topluluk', icon: '👥', color: '#6366f1', tier: 'club' },
  'multi-branch': { label: 'Çok Şubeli', icon: '📍', color: '#14b8a6', tier: 'club' },
  'has-campaign': { label: 'Kampanya', icon: '🎁', color: '#ec4899', tier: 'special' },
  'open-now': { label: 'Açık', icon: '🟢', color: '#22c55e', tier: 'special' },
  'instant-booking': { label: 'Hızlı Rez.', icon: '🚀', color: '#0ea5e9', tier: 'special' },
};

/**
 * Bir kulüp/tenant için tüm badge'leri hesaplar (otomatik + manuel).
 */
export function computeClubBadges(tenant: {
  badges: string[];
  featured: boolean;
  avgRating: string | null;
  reviewCount?: number;
  services?: string[];
  createdAt?: Date | string;
}): BadgeKey[] {
  const badges: BadgeKey[] = [];

  // Manuel badge'ler
  for (const b of tenant.badges || []) {
    if (b in BADGE_DEFINITIONS) badges.push(b as BadgeKey);
  }

  // Otomatik: verified (her aktif tenant)
  if (!badges.includes('verified')) badges.push('verified');

  // Otomatik: premium
  if (tenant.featured && !badges.includes('premium')) badges.push('premium');

  // Otomatik: new (son 30 gün)
  if (tenant.createdAt) {
    const age = Date.now() - new Date(tenant.createdAt).getTime();
    if (age < 30 * 24 * 60 * 60 * 1000 && !badges.includes('new')) badges.push('new');
  }

  // Otomatik: top-rated (4.8+ ve 10+ değerlendirme)
  const rating = parseFloat(tenant.avgRating || '0');
  const reviews = tenant.reviewCount ?? 0;
  if (rating >= 4.8 && reviews >= 10 && !badges.includes('top-rated')) {
    badges.push('top-rated');
  }

  // Otomatik: multi-service (10+ hizmet)
  if ((tenant.services?.length ?? 0) >= 10 && !badges.includes('multi-service')) {
    badges.push('multi-service');
  }

  return badges;
}

/**
 * Bir eğitmen/user için tüm badge'leri hesaplar (otomatik + manuel).
 */
export function computeTrainerBadges(user: {
  badges: string[];
  createdAt?: Date | string;
  avgRating?: string;
  totalSessions?: number;
  certifications?: unknown[] | null;
}): BadgeKey[] {
  const badges: BadgeKey[] = [];

  // Manuel badge'ler
  for (const b of user.badges || []) {
    if (b in BADGE_DEFINITIONS) badges.push(b as BadgeKey);
  }

  // Otomatik: verified
  if (!badges.includes('verified')) badges.push('verified');

  // Otomatik: new (son 30 gün)
  if (user.createdAt) {
    const age = Date.now() - new Date(user.createdAt).getTime();
    if (age < 30 * 24 * 60 * 60 * 1000 && !badges.includes('new')) badges.push('new');
  }

  // Otomatik: certified (1+ sertifika)
  if ((user.certifications?.length ?? 0) > 0 && !badges.includes('certified')) {
    badges.push('certified');
  }

  // Otomatik: expert (500+ seans)
  if ((user.totalSessions ?? 0) >= 500 && !badges.includes('expert')) {
    badges.push('expert');
  }

  // Otomatik: top-rated (4.8+ puan)
  if (parseFloat(user.avgRating || '0') >= 4.8 && !badges.includes('top-rated')) {
    badges.push('top-rated');
  }

  return badges;
}
