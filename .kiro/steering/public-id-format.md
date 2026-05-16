---
inclusion: always
---

# Public ID Formatı (Değişmez Kurallar)

Her kullanıcı/eğitmen/partner kaydedildiğinde benzersiz ve değişmez bir `publicId` atanmalıdır.

## Format Kuralları

| Rol | Prefix | Örnek |
|-----|--------|-------|
| Üye (member) | `UYE-` | `UYE-0001`, `UYE-0042` |
| Eğitmen (trainer) | `EGT-` | `EGT-0001`, `EGT-0015` |
| Partner/Kulüp (tenant/admin) | `KLB-` | `KLB-0001`, `KLB-0003` |

## Kurallar

1. `publicId` bir kez atanır, **asla değişmez**.
2. Sıralama tenant-bağımsız, global olarak artan numaralandırma ile yapılır.
3. 4 haneli padding (`0001`) — 9999'u aşarsa 5 haneye geçilir.
4. `user` tablosundaki `public_id` kolonunda saklanır (unique constraint).
5. Yeni kullanıcı oluşturan her endpoint (register, admin create member, admin create trainer vb.) kayıt sırasında otomatik `publicId` atamalıdır.
6. Frontend'de profil düzenleme/detay panellerinde bu ID gösterilmelidir.
