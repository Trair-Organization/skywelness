/**
 * Partner Badge Sistemi — hem kulüp hem eğitmen kartlarında kullanılır.
 * Backend'den gelen badge key listesini görsel rozetlere çevirir.
 */

type BadgeKey = string;

const BADGE_MAP: Record<string, { label: string; icon: string; color: string }> = {
  elite: { label: 'Elit', icon: '💎', color: '#a855f7' },
  premium: { label: 'Premium', icon: '⭐', color: '#fbbf24' },
  verified: { label: 'Doğrulanmış', icon: '✓', color: '#10b981' },
  new: { label: 'Yeni', icon: '🆕', color: '#38bdf8' },
  'top-rated': { label: 'Top Puan', icon: '🏅', color: '#f59e0b' },
  trending: { label: 'Trend', icon: '🔥', color: '#f97316' },
  'fast-response': { label: 'Hızlı', icon: '⚡', color: '#06b6d4' },
  satisfaction: { label: 'Memnuniyet', icon: '🎯', color: '#22c55e' },
  certified: { label: 'Sertifikalı', icon: '🎓', color: '#10b981' },
  expert: { label: 'Uzman', icon: '💪', color: '#8b5cf6' },
  'top-trainer': { label: 'Top 10', icon: '🏆', color: '#fbbf24' },
  'multi-service': { label: 'Çok Hizmet', icon: '🌟', color: '#38bdf8' },
  'large-community': { label: 'Topluluk', icon: '👥', color: '#6366f1' },
  'multi-branch': { label: 'Çok Şube', icon: '📍', color: '#14b8a6' },
  'has-campaign': { label: 'Kampanya', icon: '🎁', color: '#ec4899' },
  'open-now': { label: 'Açık', icon: '🟢', color: '#22c55e' },
  'instant-booking': { label: 'Hızlı Rez.', icon: '🚀', color: '#0ea5e9' },
};

export function PartnerBadges({
  badges,
  max = 3,
  size = 'sm',
}: {
  badges: BadgeKey[];
  max?: number;
  size?: 'sm' | 'md';
}) {
  if (!badges || badges.length === 0) return null;

  // Öncelik sırası: elite > premium > top-rated > certified > trending > verified > new > rest
  const priority = [
    'elite',
    'premium',
    'top-rated',
    'certified',
    'trending',
    'expert',
    'top-trainer',
    'multi-service',
    'verified',
    'new',
  ];
  const sorted = [...badges].sort((a, b) => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const visible = sorted.slice(0, max);

  return (
    <div className={`partner-badges partner-badges-${size}`}>
      {visible.map((key) => {
        const def = BADGE_MAP[key];
        if (!def) return null;
        return (
          <span
            key={key}
            className="partner-badge"
            style={
              {
                '--badge-color': def.color,
              } as React.CSSProperties
            }
            title={def.label}
          >
            <span className="partner-badge-icon">{def.icon}</span>
            <span className="partner-badge-label">{def.label}</span>
          </span>
        );
      })}
    </div>
  );
}
