import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson, ApiError } from '../../api/client';
import { useMemberAuth } from '../../auth/MemberAuthContext';
import { GradientBackground } from '../../components/premium/GradientBackground';
import { premium } from '../../theme/premiumTheme';

type Product = {
  id: string;
  title: string;
  priceLabel: string;
  imageUrl: string;
  category: 'food' | 'drink';
};
type CartRow = { product: Product; quantity: number };

const PRODUCTS: Product[] = [
  {
    id: 'fit-bowl',
    title: 'Protein Bowl',
    priceLabel: '₺280',
    imageUrl:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
    category: 'food',
  },
  {
    id: 'salad-plate',
    title: 'Akdeniz Salata',
    priceLabel: '₺240',
    imageUrl:
      'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=900&q=80',
    category: 'food',
  },
  {
    id: 'green-juice',
    title: 'Green Detox',
    priceLabel: '₺160',
    imageUrl:
      'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=900&q=80',
    category: 'drink',
  },
  {
    id: 'cold-brew',
    title: 'Cold Brew',
    priceLabel: '₺120',
    imageUrl:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
    category: 'drink',
  },
];

function parsePrice(label: string): number {
  const normalized = label.replace(/[^\d.,]/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

export function MemberCafeScreen() {
  const insets = useSafeAreaInsets();
  const { token, tenant, user } = useMemberAuth();
  const [category, setCategory] = useState<'food' | 'drink'>('food');
  const [cart, setCart] = useState<CartRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}` : '');
  const [block, setBlock] = useState('');
  const [apartment, setApartment] = useState('');
  const [phone, setPhone] = useState('');
  const [payment, setPayment] = useState<'cash' | 'card'>('cash');

  const rows = useMemo(() => PRODUCTS.filter((x) => x.category === category), [category]);

  function add(product: Product, delta: number) {
    setCart((prev) => {
      const row = prev.find((x) => x.product.id === product.id);
      if (!row && delta <= 0) return prev;
      if (!row) return [...prev, { product, quantity: delta }];
      return prev
        .map((x) =>
          x.product.id === product.id ? { ...x, quantity: Math.max(0, x.quantity + delta) } : x,
        )
        .filter((x) => x.quantity > 0);
    });
  }

  async function submit() {
    if (!token || !tenant) return;
    if (!name.trim() || !block.trim() || !apartment.trim() || !phone.trim()) {
      Alert.alert('SkyCafe', 'Lütfen teslimat alanlarını doldurun.');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('SkyCafe', 'Sepete ürün ekleyin.');
      return;
    }
    setSubmitting(true);
    try {
      await apiJson('/cafe/orders', {
        method: 'POST',
        token,
        tenantSubdomain: tenant.subdomain,
        body: JSON.stringify({
          customerName: name.trim(),
          blockLabel: block.trim(),
          apartmentLabel: apartment.trim(),
          phoneNumber: phone.trim(),
          paymentMethod: payment,
          items: cart.map((x) => ({
            productId: x.product.id,
            title: x.product.title,
            quantity: x.quantity,
            unitPrice: parsePrice(x.product.priceLabel),
          })),
        }),
      });
      Alert.alert('SkyCafe', 'Siparişiniz alındı.');
      setCart([]);
    } catch (e) {
      Alert.alert('SkyCafe', e instanceof ApiError ? e.message : 'Sipariş gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.root,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 90 },
        ]}
      >
        <Text style={styles.title}>SkyCafe Menü</Text>
        <View style={styles.row}>
          <Pressable
            style={[styles.chip, category === 'food' && styles.chipOn]}
            onPress={() => setCategory('food')}
          >
            <Text style={styles.chipTxt}>Yiyecek</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, category === 'drink' && styles.chipOn]}
            onPress={() => setCategory('drink')}
          >
            <Text style={styles.chipTxt}>İçecek</Text>
          </Pressable>
        </View>
        {rows.map((item) => {
          const qty = cart.find((x) => x.product.id === item.id)?.quantity ?? 0;
          return (
            <View key={item.id} style={styles.card}>
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.title}</Text>
                <Text style={styles.price}>{item.priceLabel}</Text>
              </View>
              <Pressable style={styles.qtyBtn} onPress={() => add(item, -1)}>
                <Text style={styles.qtyTxt}>−</Text>
              </Pressable>
              <Text style={styles.qtyNum}>{qty}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => add(item, 1)}>
                <Text style={styles.qtyTxt}>+</Text>
              </Pressable>
            </View>
          );
        })}
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="İsim Soyisim"
          placeholderTextColor={premium.textMuted}
          style={styles.input}
        />
        <TextInput
          value={block}
          onChangeText={setBlock}
          placeholder="Blok"
          placeholderTextColor={premium.textMuted}
          style={styles.input}
        />
        <TextInput
          value={apartment}
          onChangeText={setApartment}
          placeholder="Daire"
          placeholderTextColor={premium.textMuted}
          style={styles.input}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Telefon"
          placeholderTextColor={premium.textMuted}
          style={styles.input}
        />
        <View style={styles.row}>
          <Pressable
            style={[styles.chip, payment === 'cash' && styles.chipOn]}
            onPress={() => setPayment('cash')}
          >
            <Text style={styles.chipTxt}>Nakit</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, payment === 'card' && styles.chipOn]}
            onPress={() => setPayment('card')}
          >
            <Text style={styles.chipTxt}>Kart</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.submit, submitting && { opacity: 0.5 }]}
          disabled={submitting}
          onPress={() => void submit()}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitTxt}>Siparişi Gönder</Text>
          )}
        </Pressable>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: '800', color: premium.text, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipOn: { backgroundColor: 'rgba(56,189,248,0.2)', borderColor: premium.accentBlue },
  chipTxt: { color: premium.text, fontSize: 12, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 12,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  image: { width: 58, height: 58, borderRadius: 10 },
  name: { color: premium.text, fontWeight: '700' },
  price: { color: premium.textMuted, fontSize: 12, marginTop: 2 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: premium.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyTxt: { color: premium.text, fontSize: 16, fontWeight: '700' },
  qtyNum: { color: premium.text, fontWeight: '700', minWidth: 16, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: premium.glassBorder,
    borderRadius: 10,
    color: premium.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  submit: {
    marginTop: 8,
    backgroundColor: premium.accentBlue,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  submitTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
