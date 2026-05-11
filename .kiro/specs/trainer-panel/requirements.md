# Gereksinimler Dokümanı — Eğitmen Paneli (Trainer Panel)

## Giriş

Eğitmen Paneli, SkyWellness platformundaki eğitmenlerin profesyonel bir iş yönetim arayüzüne sahip olmasını sağlayan kapsamlı bir modüldür. Temel felsefe: **her eğitmen kendi başına bir kulüp/salondur**. Bağımsız eğitmenler kendi tenant'larını yönetirken, kulübe bağlı eğitmenler kulüp çatısı altında çalışır. Eğitmen; takvimini oluşturabilir, dış öğrencileri ekleyebilir, dersleri iptal/erteleme yapabilir, slotlara manuel ders atayabilir ve tüm iş süreçlerini tek panelden yönetebilir.

Mevcut `trainer`, `trainer_profile`, `trainer_member_link`, `trainer_member_note`, `availability`, `reservation`, mesajlaşma ve push notification altyapısı üzerine inşa edilecektir.

## Sözlük (Glossary)

- **Eğitmen_Paneli**: Eğitmen rolündeki kullanıcıların mobil uygulamada eriştiği ana iş yönetim arayüzü
- **Bağımsız_Eğitmen**: `independent_trainer` rolüne sahip, kendi tenant'ını (coach-xxx subdomain) yöneten eğitmen; kendi başına bir kulüp/salon gibi çalışır
- **Kulüp_Eğitmeni**: `trainer` rolüne sahip, bir kulübün tenant'ı altında çalışan eğitmen
- **Eğitmen**: Bağımsız_Eğitmen veya Kulüp_Eğitmeni rolündeki kullanıcının genel adı
- **Öğrenci**: Bir eğitmene `trainer_member_link` ile bağlı olan kullanıcı (kulüp üyesi veya dış öğrenci)
- **Dış_Öğrenci**: Eğitmenin bağlı olduğu kulübün üyesi olmayan, eğitmen tarafından manuel eklenen öğrenci
- **Müsaitlik_Slotu**: `availability` tablosundaki bir tarih-saat aralığı kaydı; eğitmenin ders verebileceği zaman dilimi
- **Ders**: `reservation` tablosundaki onaylanmış veya bekleyen bir PT/masaj seansı kaydı
- **Takvim**: Eğitmenin müsaitlik slotlarını ve derslerini gösteren zaman çizelgesi görünümü
- **Bağlantı**: `trainer_member_link` tablosundaki aktif eğitmen-öğrenci ilişkisi
- **Öğrenci_Notu**: Eğitmenin bir öğrenci hakkında tuttuğu serbest metin notu (`trainer_member_note`)
- **Bildirim_Servisi**: Mevcut push notification ve in-app bildirim altyapısı (Expo push)
- **Mesajlaşma_Servisi**: Mevcut 1:1 sohbet altyapısı (conversation + message)
- **Ders_İptali**: Onaylanmış bir dersin iptal edilmesi işlemi
- **Ders_Erteleme**: Onaylanmış bir dersin ileri bir tarihe taşınması (reschedule) işlemi
- **Manuel_Ders**: Eğitmenin mevcut bir müsaitlik slotuna doğrudan ders ataması

## Gereksinimler

### Gereksinim 1: Eğitmen Tipi Ayrımı

**Kullanıcı Hikayesi:** Bir platform yöneticisi olarak, bağımsız eğitmenler ile kulübe bağlı eğitmenlerin farklı yetki ve kapsamlarda çalışmasını istiyorum, böylece her eğitmen kendi iş modeline uygun şekilde paneli kullanabilir.

#### Kabul Kriterleri

1. WHEN bir kullanıcı `independent_trainer` rolüyle sisteme kayıt olur, THE Eğitmen_Paneli SHALL kullanıcıya kendi tenant'ı (coach-xxx subdomain) altında tam yönetim yetkisi vermeli
2. WHEN bir kullanıcı `trainer` rolüyle bir kulübe atanır, THE Eğitmen_Paneli SHALL kullanıcıya yalnızca kendi öğrencileri, takvimi ve dersleri üzerinde yönetim yetkisi vermeli
3. THE Eğitmen_Paneli SHALL Bağımsız_Eğitmen için öğrenci kabul politikası ayarı (otomatik kabul veya onay gerekli) sunmalı
4. WHILE bir Kulüp_Eğitmeni paneli kullanırken, THE Eğitmen_Paneli SHALL kulüp genelindeki ayarları (paket tanımları, fiyatlandırma) salt okunur olarak göstermeli
5. THE Eğitmen_Paneli SHALL Bağımsız_Eğitmen için kendi ders tiplerini ve fiyatlarını tanımlama imkanı sunmalı

### Gereksinim 2: Eğitmen Dashboard (İş Özeti)

**Kullanıcı Hikayesi:** Bir eğitmen olarak, panelime girdiğimde günün ve haftanın iş özetini tek bakışta görmek istiyorum, böylece güne hazırlıklı başlayabilirim.

#### Kabul Kriterleri

1. WHEN eğitmen panele giriş yapar, THE Eğitmen_Paneli SHALL dashboard ekranında bugünkü ders sayısını, bir sonraki dersin saatini ve öğrenci adını göstermeli
2. THE Eğitmen_Paneli SHALL dashboard ekranında toplam aktif öğrenci sayısını, bu haftaki toplam ders sayısını ve okunmamış mesaj sayısını göstermeli
3. THE Eğitmen_Paneli SHALL dashboard ekranında bu ayki tamamlanan ders sayısını ve iptal edilen ders sayısını göstermeli
4. WHEN eğitmenin bugün en az bir dersi varsa, THE Eğitmen_Paneli SHALL bugünkü derslerin mini listesini (saat + öğrenci adı) dashboard üzerinde göstermeli
5. IF eğitmenin bugün hiç dersi yoksa, THEN THE Eğitmen_Paneli SHALL "Bugün ders yok" bilgisi ile bir sonraki dersin tarih ve saatini göstermeli
6. IF kullanıcının rolü `trainer` veya `independent_trainer` değilse, THEN THE Eğitmen_Paneli SHALL eğitmen paneli rotalarına erişimi engellemeli

### Gereksinim 3: Takvim ve Müsaitlik Yönetimi

**Kullanıcı Hikayesi:** Bir eğitmen olarak, kendi müsaitlik takvimimi oluşturmak, düzenlemek ve silmek istiyorum, böylece öğrencilerim yalnızca uygun olduğum zamanlarda ders alabilir.

#### Kabul Kriterleri

1. WHEN eğitmen takvim ekranını açar, THE Eğitmen_Paneli SHALL mevcut müsaitlik slotlarını ve atanmış dersleri takvim görünümünde (günlük/haftalık) göstermeli
2. WHEN eğitmen "Slot Ekle" butonuna tıklar, THE Eğitmen_Paneli SHALL tarih, başlangıç saati ve bitiş saati seçimi yapılabilir bir form göstermeli
3. WHEN eğitmen yeni bir müsaitlik slotu kaydeder, THE Eğitmen_Paneli SHALL `availability` tablosuna ilgili trainer_id, tarih, başlangıç ve bitiş saati ile kayıt oluşturmalı
4. WHEN eğitmen mevcut bir müsaitlik slotunu düzenlemek ister, THE Eğitmen_Paneli SHALL slotun tarih ve saat bilgilerini güncellenebilir formda göstermeli
5. WHEN eğitmen bir müsaitlik slotunu silmek ister, THE Eğitmen_Paneli SHALL slota atanmış ders olup olmadığını kontrol etmeli
6. IF silinmek istenen slota atanmış aktif bir ders varsa, THEN THE Eğitmen_Paneli SHALL silme işlemini engellemeli ve "Bu slotta aktif ders var, önce dersi iptal edin veya taşıyın" uyarısı göstermeli
7. IF silinmek istenen slotta aktif ders yoksa, THEN THE Eğitmen_Paneli SHALL slotu `availability` tablosundan kaldırmalı
8. WHEN eğitmen tekrarlayan müsaitlik oluşturmak ister, THE Eğitmen_Paneli SHALL haftalık tekrar seçeneği ile birden fazla slotu toplu oluşturmalı
9. THE Eğitmen_Paneli SHALL müsaitlik slotlarını dolu (ders atanmış) ve boş (müsait) olarak görsel olarak ayırt edilebilir şekilde göstermeli

### Gereksinim 4: Öğrenci Yönetimi

**Kullanıcı Hikayesi:** Bir eğitmen olarak, bana bağlı tüm öğrencilerimi yönetmek, yeni dış öğrenciler eklemek ve her öğrencimin durumunu takip etmek istiyorum.

#### Kabul Kriterleri

1. WHEN eğitmen öğrenci listesi ekranını açar, THE Eğitmen_Paneli SHALL bağlantı durumu aktif olan tüm öğrencileri ad-soyad, bağlantı tarihi, son ders tarihi ve öğrenci kaynağı (kulüp üyesi/dış öğrenci) ile birlikte listemeli
2. THE Eğitmen_Paneli SHALL öğrenci listesini ada göre arama yapılabilir şekilde sunmalı
3. WHEN eğitmen bir öğrenci kartına tıklar, THE Eğitmen_Paneli SHALL öğrencinin detay sayfasını göstermeli (notlar, geçmiş dersler, kalan paket hakkı, iletişim bilgileri)
4. WHEN eğitmen "Dış Öğrenci Ekle" butonuna tıklar, THE Eğitmen_Paneli SHALL ad, soyad, telefon ve e-posta bilgilerini girilebilir bir form göstermeli
5. WHEN eğitmen dış öğrenci formunu doldurur ve kaydeder, THE Eğitmen_Paneli SHALL yeni bir kullanıcı kaydı oluşturmalı ve `trainer_member_link` tablosunda aktif bağlantı kurmalı
6. IF girilen e-posta veya telefon numarası sistemde zaten kayıtlıysa, THEN THE Eğitmen_Paneli SHALL mevcut kullanıcıyı bulmalı ve bağlantı oluşturmalı (yeni kullanıcı oluşturmamalı)
7. WHEN eğitmen bir öğrenciyi arşivlemek ister, THE Eğitmen_Paneli SHALL bağlantı durumunu `archived` olarak güncellemeli
8. IF eğitmenin hiç aktif öğrencisi yoksa, THEN THE Eğitmen_Paneli SHALL boş durum mesajı ve "Öğrenci Ekle" yönlendirmesi göstermeli

### Gereksinim 5: Öğrenci Bağlantı Akışı (Çift Yönlü)

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, bir eğitmene bağlanmak istiyorum; aynı zamanda eğitmen de beni kendi öğrencisi olarak ekleyebilmeli.

#### Kabul Kriterleri

1. WHEN bir üye eğitmen profil sayfasında "Eğitmenime Ekle" butonuna tıklar, THE Eğitmen_Paneli SHALL `trainer_member_link` tablosunda aktif bir bağlantı oluşturmalı
2. WHEN bağlantı üye tarafından başarıyla oluşturulur, THE Bildirim_Servisi SHALL eğitmene "Yeni öğrenci bağlandı" push notification göndermeli
3. WHEN eğitmen "Dış Öğrenci Ekle" ile bir öğrenci ekler, THE Bildirim_Servisi SHALL öğrenciye "Eğitmen sizi öğrenci olarak ekledi" push notification göndermeli (kullanıcı sistemde kayıtlıysa)
4. IF üye zaten bu eğitmene aktif bağlıysa, THEN THE Eğitmen_Paneli SHALL "Zaten bağlısınız" mesajı göstermeli ve yeni bağlantı oluşturmamalı
5. IF üye daha önce bağlanıp arşivlenmişse, THEN THE Eğitmen_Paneli SHALL mevcut bağlantıyı tekrar aktif duruma getirmeli
6. WHEN bir üye veya eğitmen bağlantıyı sonlandırmak ister, THE Eğitmen_Paneli SHALL bağlantı durumunu `archived` olarak güncellemeli

### Gereksinim 6: Ders Yönetimi — Manuel Ders Ekleme

**Kullanıcı Hikayesi:** Bir eğitmen olarak, müsait slotlarıma manuel olarak ders atamak istiyorum, böylece telefon veya yüz yüze anlaşılan dersleri sisteme kaydedebilirim.

#### Kabul Kriterleri

1. WHEN eğitmen takvimde boş bir müsaitlik slotuna tıklar, THE Eğitmen_Paneli SHALL "Ders Ekle" seçeneğini göstermeli
2. WHEN eğitmen "Ders Ekle" seçeneğini seçer, THE Eğitmen_Paneli SHALL öğrenci seçimi (bağlı öğrenciler listesinden), ders tipi ve not alanı içeren bir form göstermeli
3. WHEN eğitmen formu doldurur ve kaydeder, THE Eğitmen_Paneli SHALL `reservation` tablosunda ilgili slot, öğrenci ve eğitmen bilgileriyle yeni bir kayıt oluşturmalı ve durumu `confirmed` olarak ayarlamalı
4. WHEN manuel ders başarıyla oluşturulur, THE Bildirim_Servisi SHALL öğrenciye "Eğitmeniniz yeni bir ders planladı" push notification göndermeli
5. THE Eğitmen_Paneli SHALL müsaitlik slotunun dolu durumunu takvimde görsel olarak güncellemeli
6. IF seçilen slotta zaten bir ders varsa, THEN THE Eğitmen_Paneli SHALL "Bu slot dolu" uyarısı göstermeli ve ders eklemeyi engellemeli

### Gereksinim 7: Ders Yönetimi — İptal

**Kullanıcı Hikayesi:** Bir eğitmen olarak, planlanmış bir dersi iptal etmek istiyorum, böylece beklenmedik durumlarda programımı güncelleyebilirim.

#### Kabul Kriterleri

1. WHEN eğitmen bir onaylanmış veya bekleyen dersin detayını açar, THE Eğitmen_Paneli SHALL "Dersi İptal Et" butonunu göstermeli
2. WHEN eğitmen "Dersi İptal Et" butonuna tıklar, THE Eğitmen_Paneli SHALL iptal nedeni girilebilir bir onay diyalogu göstermeli
3. WHEN eğitmen iptal işlemini onaylar, THE Eğitmen_Paneli SHALL `reservation` tablosundaki kaydın durumunu `cancelled` olarak güncellemeli ve `cancelled_at` alanını doldurmalı
4. WHEN ders başarıyla iptal edilir, THE Bildirim_Servisi SHALL öğrenciye "Dersiniz iptal edildi" push notification göndermeli (iptal nedeni ile birlikte)
5. WHEN ders iptal edilir, THE Eğitmen_Paneli SHALL ilgili müsaitlik slotunu tekrar boş (müsait) duruma getirmeli
6. IF ders başlangıç saatine 1 saatten az kalmışsa, THEN THE Eğitmen_Paneli SHALL "Son dakika iptali — öğrenci bilgilendirilecek" uyarısı göstermeli (iptal engellenmemeli)

### Gereksinim 8: Ders Yönetimi — Erteleme (Reschedule)

**Kullanıcı Hikayesi:** Bir eğitmen olarak, planlanmış bir dersi ileri bir tarihe taşımak istiyorum, böylece program değişikliklerini kolayca yönetebilirim.

#### Kabul Kriterleri

1. WHEN eğitmen bir onaylanmış veya bekleyen dersin detayını açar, THE Eğitmen_Paneli SHALL "İleri Tarihe Al" butonunu göstermeli
2. WHEN eğitmen "İleri Tarihe Al" butonuna tıklar, THE Eğitmen_Paneli SHALL eğitmenin boş müsaitlik slotlarını listeleyen bir tarih/slot seçim ekranı göstermeli
3. WHEN eğitmen yeni bir slot seçer ve onaylar, THE Eğitmen_Paneli SHALL mevcut rezervasyonun tarih ve saat bilgilerini yeni slota göre güncellemeli
4. WHEN ders başarıyla ertelenir, THE Bildirim_Servisi SHALL öğrenciye "Dersiniz yeni tarihe taşındı" push notification göndermeli (eski ve yeni tarih bilgisiyle)
5. WHEN ders ertelenir, THE Eğitmen_Paneli SHALL eski slotu boş (müsait) duruma getirmeli ve yeni slotu dolu olarak işaretlemeli
6. IF eğitmenin boş müsaitlik slotu yoksa, THEN THE Eğitmen_Paneli SHALL "Müsait slot bulunamadı, önce yeni slot oluşturun" mesajı göstermeli

### Gereksinim 9: Ders Programı Görüntüleme

**Kullanıcı Hikayesi:** Bir eğitmen olarak, günlük ve haftalık ders programımı detaylı görmek istiyorum, böylece zamanımı profesyonelce planlayabilirim.

#### Kabul Kriterleri

1. WHEN eğitmen program ekranını açar, THE Eğitmen_Paneli SHALL bugünün tarihinden itibaren gelecekteki tüm onaylanmış ve bekleyen dersleri kronolojik sırayla göstermeli
2. THE Eğitmen_Paneli SHALL her ders kartında öğrenci adını, ders tipini, başlangıç saatini, bitiş saatini ve ders durumunu (onaylanmış/bekleyen) göstermeli
3. WHEN eğitmen bir gün seçer, THE Eğitmen_Paneli SHALL yalnızca seçilen güne ait dersleri filtrelemeli
4. WHILE program ekranı açıkken, THE Eğitmen_Paneli SHALL günlük ve haftalık görünüm arasında geçiş yapılabilir olmalı
5. IF seçilen günde hiç ders yoksa, THEN THE Eğitmen_Paneli SHALL "Bu gün için ders bulunmuyor" mesajı göstermeli
6. WHEN eğitmen bir ders kartına tıklar, THE Eğitmen_Paneli SHALL ders detay sayfasını açmalı (iptal, erteleme, not ekleme seçenekleriyle)

### Gereksinim 10: Öğrenci Notu Ekleme ve Görüntüleme

**Kullanıcı Hikayesi:** Bir eğitmen olarak, öğrencilerim hakkında not tutmak istiyorum, böylece ders planlaması ve ilerleme takibi yapabilirim.

#### Kabul Kriterleri

1. WHEN eğitmen bir öğrencinin detay sayfasında "Not Ekle" butonuna tıklar, THE Eğitmen_Paneli SHALL bir metin giriş alanı göstermeli
2. WHEN eğitmen not metnini girer ve kaydet butonuna tıklar, THE Eğitmen_Paneli SHALL notu `trainer_member_note` tablosuna kaydetmeli ve listeyi güncellemeli
3. THE Eğitmen_Paneli SHALL bir öğrenciye ait tüm notları oluşturulma tarihine göre en yeniden en eskiye sıralı göstermeli
4. IF not metni boşsa, THEN THE Eğitmen_Paneli SHALL kaydet butonunu devre dışı bırakmalı

### Gereksinim 11: Mesajlaşma

**Kullanıcı Hikayesi:** Bir eğitmen olarak, öğrencilerimle doğrudan mesajlaşmak istiyorum, böylece ders değişiklikleri, motivasyon mesajları veya bilgilendirme yapabilirim.

#### Kabul Kriterleri

1. WHEN eğitmen bir öğrencinin detay sayfasında "Mesaj Gönder" butonuna tıklar, THE Eğitmen_Paneli SHALL mevcut Mesajlaşma_Servisi üzerinden öğrenciyle sohbet ekranını açmalı
2. THE Eğitmen_Paneli SHALL eğitmenin tüm aktif sohbetlerini mesajlar sekmesinde listelemeli (son mesaj önizlemesi ve okunmamış sayısı ile)
3. WHEN eğitmene yeni bir mesaj gelir, THE Bildirim_Servisi SHALL push notification göndermeli
4. WHEN eğitmen öğrenci listesinden bir öğrenciye mesaj göndermek ister, THE Eğitmen_Paneli SHALL mevcut conversation oluşturma veya getirme akışını kullanmalı

### Gereksinim 12: Profil Yönetimi

**Kullanıcı Hikayesi:** Bir eğitmen olarak, profesyonel profil bilgilerimi güncellemek istiyorum, böylece potansiyel öğrenciler beni tanıyabilir ve güvenebilir.

#### Kabul Kriterleri

1. WHEN eğitmen profil düzenleme ekranını açar, THE Eğitmen_Paneli SHALL mevcut biyografi, uzmanlık alanları, sertifikalar, deneyim yılı, şehir, fotoğraf ve sosyal medya bağlantılarını düzenlenebilir formda göstermeli
2. WHEN eğitmen profil bilgilerini günceller ve kaydet butonuna tıklar, THE Eğitmen_Paneli SHALL değişiklikleri `trainer_profile` tablosunda güncellemeli
3. IF zorunlu alanlardan (biyografi, uzmanlık alanları, şehir) biri boş bırakılırsa, THEN THE Eğitmen_Paneli SHALL ilgili alan için doğrulama hatası göstermeli
4. WHERE Bağımsız_Eğitmen profil düzenleme yapar, THE Eğitmen_Paneli SHALL fiyatlandırma notu (pricing_note) alanını da düzenlenebilir olarak sunmalı

### Gereksinim 13: Bildirimler

**Kullanıcı Hikayesi:** Bir eğitmen olarak, önemli olaylar hakkında anında bilgilendirilmek istiyorum, böylece hiçbir gelişmeyi kaçırmam.

#### Kabul Kriterleri

1. WHEN saat 08:00 olur ve eğitmenin o gün en az bir onaylanmış dersi varsa, THE Bildirim_Servisi SHALL eğitmene bugünkü ders sayısını ve ilk dersin saatini içeren push notification göndermeli
2. IF eğitmenin o gün hiç onaylanmış dersi yoksa, THEN THE Bildirim_Servisi SHALL sabah bildirimi göndermemeli
3. WHEN bir öğrenci eğitmene yeni bağlantı isteği gönderir, THE Bildirim_Servisi SHALL eğitmene "Yeni öğrenci bağlandı" push notification göndermeli
4. WHEN bir öğrenci kendi dersini iptal eder, THE Bildirim_Servisi SHALL eğitmene "Öğrenci dersi iptal etti" push notification göndermeli (öğrenci adı ve ders tarihi ile)
5. WHEN bir dersin başlangıcına 1 saat kala, THE Bildirim_Servisi SHALL eğitmene "1 saat sonra dersiniz var" hatırlatma bildirimi göndermeli
6. WHEN bir dersin başlangıcına 1 saat kala, THE Bildirim_Servisi SHALL öğrenciye "1 saat sonra dersiniz var" hatırlatma bildirimi göndermeli

### Gereksinim 14: Öğrenci Paket Durumu Görüntüleme

**Kullanıcı Hikayesi:** Bir eğitmen olarak, öğrencilerimin kalan paket haklarını görmek istiyorum, böylece paket yenileme zamanını takip edebilirim.

#### Kabul Kriterleri

1. WHEN eğitmen bir öğrencinin detay sayfasını görüntüler, THE Eğitmen_Paneli SHALL öğrencinin aktif paketlerini (paket adı, kalan ders hakkı, son kullanma tarihi) göstermeli
2. WHILE bir öğrencinin kalan ders hakkı 2 veya altına düşmüşse, THE Eğitmen_Paneli SHALL paket bilgisini uyarı rengiyle vurgulamalı
3. IF öğrencinin aktif paketi yoksa, THEN THE Eğitmen_Paneli SHALL "Aktif paket bulunmuyor" mesajı göstermeli

### Gereksinim 15: Geçmiş Ders Kayıtları

**Kullanıcı Hikayesi:** Bir eğitmen olarak, bir öğrenciyle geçmiş derslerimin kaydını görmek istiyorum, böylece ilerlemeyi takip edebilir ve raporlama yapabilirim.

#### Kabul Kriterleri

1. WHEN eğitmen bir öğrencinin detay sayfasında "Geçmiş Dersler" sekmesini açar, THE Eğitmen_Paneli SHALL tamamlanmış ve iptal edilmiş dersleri tarih sırasıyla (en yeniden en eskiye) listemeli
2. THE Eğitmen_Paneli SHALL her geçmiş ders kaydında tarih, saat, ders tipi ve durumu (tamamlandı/iptal) göstermeli
3. THE Eğitmen_Paneli SHALL öğrenci detay sayfasında toplam tamamlanan ders sayısını göstermeli
