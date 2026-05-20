/**
 * Eğitmen public profil URL'sini oluşturur.
 * publicId varsa onu (örn. EGT-4R8N → /trainer/egt-4r8n),
 * yoksa fallback olarak verilen UUID'yi kullanır.
 */
export function trainerProfilePath(opts: {
  publicId?: string | null;
  fallbackId?: string | null;
}): string {
  const slug = opts.publicId?.trim() || opts.fallbackId?.trim();
  if (!slug) return '/discover';
  return `/trainer/${slug.toLowerCase()}`;
}
