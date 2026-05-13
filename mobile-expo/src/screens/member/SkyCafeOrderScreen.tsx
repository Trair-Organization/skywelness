import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { showToast } from '../../components/premium/Toast';
import { premium } from '../../theme/premiumTheme';

type ProductItem = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  imageUrl: string | null;
};

type CategoryGroup = {
  category: string;
  items: ProductItem[];
};

type CartItem = {
  product: ProductItem;
  quantity: number;
};

const SKYCAFE_SUBDOMAIN = 'skycafe';

export function SkyCafeOrderScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { token, tenant, user } = useMemberAuth();

  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [ordering, setOrdering] = useState(false);

  // Sipariş bilgileri
  const [blockLabel, setBlockLabel] = useState('');
  const [apartmentLabel, setApartmentLabel] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');

  const loadProducts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiJson<{ categories: CategoryGroup[] }>(
        `/cafe/products?tenant=${SKYCAFE_SUBDOMAIN}`,
        { token, tenantSubdomain: tenant?.subdomain },
      );
      setCategories(data.categories);
    } catch {
      showToast('Menü yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, tenant?.subdomain]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const addToCart = (product: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`${product.name} sepete eklendi`, 'success');
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) => c.product.id === productId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter((c) => c.product.id !== productId);
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + parseFloat(c.product.price) * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleOrder = async () => {
    if (!token || !user || cart.length === 0) return;
    if (!blockLabel.trim() || !apartmentLabel.trim()) {
      showToast('Blok ve daire bilgisi zorunludur', 'warning');
      return;
    }
    setOrdering(true);
    try {
      await apiJson('/cafe/orders', {
        method: 'POST',
        token,
        tenantSubdomain: SKYCAFE_SUBDOMAIN,
        body: JSON.stringify({
          customerName: `${user.firstName} ${user.lastName}`.trim(),
          blockLabel: blockLabel.trim(),
          apartmentLabel: apartmentLabel.trim(),
          phoneNumber: user.phone || '',
          paymentMethod,
          items: cart.map((c) => ({
            productId: c.product.id,
            title: c.product.name,
            unitPrice: parseFloat(c.product.price),
            quantity: c.quantity,
          })),
        }),
      });
      showToast('Siparişiniz alındı! ☕', 'success');
      setCart([]);
      setShowCart(false);
      setBlockLabel('');
      setApartmentLabel('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Sipariş verilemedi', 'error');
    } finally {
      setOrdering(false);
    }
  };

  const categoryEmoji = (cat: string) => {
    if (cat.includes('Kahvaltı')) return '🍳';
    if (cat.includes('Yemek')) return '🥗';
    if (cat.includes('Soft')) return '🥤';
    if (cat.includes('Kokteyl') || cat.includes('Signature')) return '🍸';
    if (cat.includes('Mocktail')) return '🍹';
    return '☕';
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + 80 }]}>
          <ActivityIndicator size="large" color={premium.accentBlue} />
          <Text style={{ color: premium.textMuted, marginTop: 12 }}>Menü yükleniyor...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnTxt}>← Geri</Text>
          </Pressable>
          <Text style={styles.title}>☕ SkyCafe</Text>
          <Text style={styles.subtitle}>Fit · Fresh · Strong</Text>
        </View>

        {/* Sepet butonu */}
        {cartCount > 0 && !showCart && (
          <Pressable style={styles.cartFloating} onPress={() => setShowCart(true)}>
            <Text style={styles.cartFloatingTxt}>🛒 Sepet ({cartCount}) — {cartTotal}₺</Text>
          </Pressable>
        )}

        {/* Sepet görünümü */}
        {showCart ? (
          <View style={styles.cartSection}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>🛒 Sepetim</Text>
              <Pressable onPress={() => setShowCart(false)}>
                <Text style={{ color: premium.accentBlue, fontWeight: '700' }}>Menüye Dön</Text>
              </Pressable>
            </View>

            {cart.map((c) => (
              <View key={c.product.id} style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{c.product.name}</Text>
                  <Text style={styles.cartItemPrice}>{c.product.price}₺ × {c.quantity}</Text>
                </View>
                <View style={styles.cartItemActions}>
                  <Pressable onPress={() => removeFromCart(c.product.id)} style={styles.cartBtn}>
                    <Text style={styles.cartBtnTxt}>−</Text>
                  </Pressable>
                  <Text style={styles.cartQty}>{c.quantity}</Text>
                  <Pressable onPress={() => addToCart(c.product)} style={styles.cartBtn}>
                    <Text style={styles.cartBtnTxt}>+</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            <View style={styles.cartTotal}>
              <Text style={styles.cartTotalLabel}>Toplam</Text>
              <Text style={styles.cartTotalValue}>{cartTotal}₺</Text>
            </View>

            {/* Teslimat bilgileri */}
            <View style={styles.deliverySection}>
              <Text style={styles.deliveryTitle}>📍 Teslimat Bilgileri</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={blockLabel}
                  onChangeText={setBlockLabel}
                  placeholder="Blok"
                  placeholderTextColor={premium.textMuted}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={apartmentLabel}
                  onChangeText={setApartmentLabel}
                  placeholder="Daire No"
                  placeholderTextColor={premium.textMuted}
                />
              </View>
            </View>

            {/* Ödeme yöntemi */}
            <View style={styles.paymentSection}>
              <Text style={styles.deliveryTitle}>💳 Ödeme Yöntemi</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  style={[styles.paymentBtn, paymentMethod === 'cash' && styles.paymentBtnActive]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Text style={[styles.paymentBtnTxt, paymentMethod === 'cash' && styles.paymentBtnTxtActive]}>💵 Nakit</Text>
                </Pressable>
                <Pressable
                  style={[styles.paymentBtn, paymentMethod === 'card' && styles.paymentBtnActive]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <Text style={[styles.paymentBtnTxt, paymentMethod === 'card' && styles.paymentBtnTxtActive]}>💳 Kart</Text>
                </Pressable>
              </View>
            </View>

            {/* Sipariş ver */}
            <Pressable
              style={[styles.orderBtn, ordering && { opacity: 0.5 }]}
              onPress={handleOrder}
              disabled={ordering || cart.length === 0}
            >
              <Text style={styles.orderBtnTxt}>
                {ordering ? '⏳ Sipariş veriliyor...' : `✅ Sipariş Ver — ${cartTotal}₺`}
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Menü */
          <View style={styles.menuSection}>
            {categories.map((cat) => (
              <View key={cat.category} style={styles.categoryBlock}>
                <Text style={styles.categoryTitle}>{categoryEmoji(cat.category)} {cat.category}</Text>
                {cat.items.map((item) => (
                  <Pressable key={item.id} style={styles.productCard} onPress={() => addToCart(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
                      )}
                    </View>
                    <View style={styles.productRight}>
                      <Text style={styles.productPrice}>{item.price}₺</Text>
                      <Text style={styles.addBtn}>+</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  backBtn: { marginBottom: 8 },
  backBtnTxt: { color: premium.accentBlue, fontSize: 14, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '900', color: premium.text },
  subtitle: { fontSize: 14, color: premium.textMuted, marginTop: 2 },
  // Cart floating
  cartFloating: { marginHorizontal: 20, marginBottom: 12, backgroundColor: premium.accentGreen, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cartFloatingTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  // Menu
  menuSection: { paddingHorizontal: 20 },
  categoryBlock: { marginBottom: 20 },
  categoryTitle: { fontSize: 17, fontWeight: '800', color: premium.text, marginBottom: 10 },
  productCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: premium.glassBorder, backgroundColor: premium.glass, marginBottom: 8 },
  productName: { fontSize: 14, fontWeight: '700', color: premium.text },
  productDesc: { fontSize: 11, color: premium.textMuted, marginTop: 3, lineHeight: 15 },
  productRight: { alignItems: 'flex-end', gap: 4 },
  productPrice: { fontSize: 16, fontWeight: '900', color: premium.accentGreen },
  addBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)', textAlign: 'center', lineHeight: 26, color: premium.accentGreen, fontSize: 18, fontWeight: '700' },
  // Cart
  cartSection: { paddingHorizontal: 20 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cartTitle: { fontSize: 20, fontWeight: '800', color: premium.text },
  cartItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: premium.glassBorder, backgroundColor: premium.glass, marginBottom: 8 },
  cartItemName: { fontSize: 14, fontWeight: '700', color: premium.text },
  cartItemPrice: { fontSize: 12, color: premium.textMuted, marginTop: 2 },
  cartItemActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(56,189,248,0.15)', alignItems: 'center', justifyContent: 'center' },
  cartBtnTxt: { color: premium.accentBlue, fontSize: 18, fontWeight: '700' },
  cartQty: { fontSize: 16, fontWeight: '800', color: premium.text, minWidth: 20, textAlign: 'center' },
  cartTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: premium.glassBorder },
  cartTotalLabel: { fontSize: 16, fontWeight: '700', color: premium.text },
  cartTotalValue: { fontSize: 24, fontWeight: '900', color: premium.accentGreen },
  // Delivery
  deliverySection: { marginTop: 20 },
  deliveryTitle: { fontSize: 14, fontWeight: '700', color: premium.text, marginBottom: 8 },
  input: { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: premium.glassBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: premium.text, fontSize: 15 },
  // Payment
  paymentSection: { marginTop: 16 },
  paymentBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: premium.glassBorder, backgroundColor: premium.glass, alignItems: 'center' },
  paymentBtnActive: { borderColor: premium.accentBlue, backgroundColor: 'rgba(56,189,248,0.1)' },
  paymentBtnTxt: { fontSize: 14, fontWeight: '700', color: premium.textMuted },
  paymentBtnTxtActive: { color: premium.accentBlue },
  // Order
  orderBtn: { marginTop: 20, backgroundColor: premium.accentGreen, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  orderBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
