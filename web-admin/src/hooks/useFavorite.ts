import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

/**
 * Favori durumunu yöneten hook.
 * Giriş yapmış kullanıcı için favori kontrol/ekleme/kaldırma.
 */
export function useFavorite(targetType: 'club' | 'trainer', targetId: string | undefined) {
  const { token } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !targetId) return;
    queueMicrotask(() => {
      apiJson<{ isFavorite: boolean; favoriteId: string | null }>(
        `/marketplace/me/favorites/check?targetType=${targetType}&targetId=${targetId}`,
      )
        .then((res) => {
          setIsFavorite(res.isFavorite);
          setFavoriteId(res.favoriteId);
        })
        .catch(() => {});
    });
  }, [token, targetType, targetId]);

  const toggle = useCallback(async () => {
    if (!token || !targetId) return;
    setLoading(true);
    try {
      if (isFavorite && favoriteId) {
        await apiJson(`/marketplace/me/favorites/${favoriteId}`, { method: 'DELETE' });
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        const res = await apiJson<{ success: boolean; id: string }>('/marketplace/me/favorites', {
          method: 'POST',
          body: JSON.stringify({ targetType, targetId }),
        });
        setIsFavorite(true);
        setFavoriteId(res.id);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token, targetId, targetType, isFavorite, favoriteId]);

  return { isFavorite, toggle, loading, isLoggedIn: !!token };
}
