import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';

type Product = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: string;
  currency: string;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export function CafeProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<Product[]>('/cafe/products/admin');
      setProducts(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setName(''); setCategory(''); setDescription(''); setPrice(''); setImageUrl('');
    setEditingId(null); setShowForm(false);
  };

  const startEdit = (p: Product) => {
    setName(p.name);
    setCategory(p.category);
    setDescription(p.description ?? '');
    setPrice(p.price);
    setImageUrl(p.imageUrl ?? '');
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !category.trim() || !price) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiJson(`/cafe/products/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            category: category.trim(),
            description: description.trim() || null,
            price: parseFloat(price),
            imageUrl: imageUrl.trim() || null,
          }),
        });
      } else {
        await apiJson('/cafe/products', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            category: category.trim(),
            description: description.trim() || undefined,
            price: parseFloat(price),
            imageUrl: imageUrl.trim() || undefined,
          }),
        });
      }
      resetForm();
      await load();
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'Kaydedilemedi'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/cafe/products/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'Silinemedi'}`);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      await apiJson(`/cafe/products/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !p.active }),
      });
      await load();
    } catch { /* ignore */ }
  };

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiJson<{ url: string }>('/auth/upload-image', {
        method: 'POST',
        body: formData,
        headers: undefined,
      });
      setImageUrl(`https://www.wellnessclub.tech${res.url}`);
    } catch {
      alert('Görsel yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  // Kategorilere göre grupla
  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>☕ Ürün Yönetimi</h1>
          <p className="muted">Cafe menünüzü yönetin — ürün ekleyin, düzenleyin, fiyat güncelleyin</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: '#34d399', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
        >
          + Yeni Ürün Ekle
        </button>
      </div>

      {/* Ürün Formu */}
      {showForm && (
        <div style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.03)', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '1rem' }}>
            {editingId ? '✏️ Ürün Düzenle' : '+ Yeni Ürün'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Ürün Adı</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Sky Protein Bowl" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Kategori</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Örn: Yemek, Soft İçecekler, Kokteyller" list="categories" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
              <datalist id="categories">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Fiyat (₺)</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="450" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Görsel</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {imageUrl && <img src={imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />}
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(f); }} style={{ fontSize: '0.8rem', color: '#94a3b8' }} disabled={uploading} />
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Açıklama (opsiyonel)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Ürün detayı..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button onClick={handleSave} disabled={saving || !name.trim() || !category.trim() || !price} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', background: '#38bdf8', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
              {saving ? '⏳ Kaydediliyor...' : editingId ? '💾 Güncelle' : '✓ Ekle'}
            </button>
            <button onClick={resetForm} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', background: 'transparent', color: '#94a3b8', fontWeight: 700, border: '1px solid rgba(148,163,184,0.2)', cursor: 'pointer' }}>
              İptal
            </button>
          </div>
        </div>
      )}

      {loading && <p className="muted">Yükleniyor...</p>}

      {/* Ürün Listesi — Kategoriye göre */}
      {!loading && categories.map((cat) => (
        <div key={cat} style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1px solid rgba(148,163,184,0.1)', paddingBottom: '0.5rem' }}>
            {cat === 'Kahvaltı' ? '🍳' : cat === 'Yemek' ? '🥗' : cat === 'Soft İçecekler' ? '🥤' : cat === 'Kokteyller' ? '🍸' : cat === 'Mocktails' ? '🍹' : cat === 'Signature Classics' ? '🍷' : '☕'} {cat}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {products.filter((p) => p.category === cat).map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.1)', background: p.active ? 'rgba(0,0,0,0.1)' : 'rgba(239,68,68,0.05)', opacity: p.active ? 1 : 0.6 }}>
                {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                  {p.description && <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>{p.description.slice(0, 80)}{p.description.length > 80 ? '...' : ''}</div>}
                </div>
                <span style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem', minWidth: '60px', textAlign: 'right' }}>{p.price}₺</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => handleToggleActive(p)} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: 'none', background: p.active ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', color: p.active ? '#f59e0b' : '#22c55e', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>
                    {p.active ? 'Pasif Yap' : 'Aktif Yap'}
                  </button>
                  <button onClick={() => startEdit(p)} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: 'none', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>
                    Düzenle
                  </button>
                  <button onClick={() => handleDelete(p.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!loading && products.length === 0 && (
        <p className="muted">Henüz ürün eklenmemiş. "Yeni Ürün Ekle" butonuna tıklayın.</p>
      )}
    </div>
  );
}
