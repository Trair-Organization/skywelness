---
inclusion: always
---

# Public ID Formatı (Değişmez Kurallar)

Her kullanıcı/eğitmen/partner kaydedildiğinde benzersiz ve değişmez bir `publicId` atanmalıdır.

## Format Kuralları

| Rol | Prefix | Örnek |
|-----|--------|-------|
| Üye (member) | `UYE-` | `UYE-7K3M`, `UYE-9P2X` |
| Eğitmen (trainer) | `EGT-` | `EGT-4R8N`, `EGT-6W1T` |
| Partner/Kulüp (tenant/admin) | `KLB-` | `KLB-2H5Q`, `KLB-8J4V` |

## Kurallar

1. `publicId` bir kez atanır, **asla değişmez**.
2. Prefix'ten sonra 4 karakterlik alfanumerik (harf+rakam karışık) kod gelir — tahmin edilemez olmalıdır.
3. Harf seti: Karışıklık yaratabilecek karakterler hariç (`0O`, `1I`, `L`) → `23456789ABCDEFGHJKMNPQRSTVWXYZ`
4. `user` tablosundaki `public_id` kolonunda saklanır (unique constraint).
5. Yeni kullanıcı oluşturan her endpoint kayıt sırasında otomatik `publicId` atamalıdır.
6. Frontend'de profil düzenleme/detay panellerinde bu ID gösterilmelidir.
7. Dashboard'da "Kulüp Kodu" olarak `KLB-XXXX` public ID gösterilir (`invite_code` kullanılmaz).
