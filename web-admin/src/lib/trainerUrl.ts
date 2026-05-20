/**
 * Eğitmen public profil URL'sini oluşturur.
 *
 * Öncelik sırası:
 *   1. SEO slug (örn. /trainer/baha-citir) — sosyal medyaya uygun
 *   2. publicId (örn. /trainer/egt-4r8n) — slug yoksa
 *   3. UUID — fallback
 */
export function trainerProfilePath(opts: {
  slug?: string | null;
  publicId?: string | null;
  fallbackId?: string | null;
}): string {
  const value =
    opts.slug?.trim() || opts.publicId?.trim() || opts.fallbackId?.trim();
  if (!value) return '/discover';
  return `/trainer/${value.toLowerCase()}`;
}
