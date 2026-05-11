# Requirements Document

## Introduction

Skyland Wellness, farklı iş modellerinde faaliyet gösteren birden çok partner kulübe (tenant) ev sahipliği yapan çok kiracılı (multi-tenant) bir platformdur. Bazı partner kulüpler marketplace mantığıyla çalışır (örn. O'Padel — herkes doğrudan kort rezervasyonu yapabilir), bazıları ise kapalı topluluk mantığıyla çalışır (örn. rezidans içi Skyland Wellness — yalnızca onaylı üyeler hizmete erişebilir).

Bu özellik, her partner kulübün kendi erişim modelini seçmesine olanak tanıyan **public vs private** görünürlük modelini tanıtır:

- **Public** kulüpler: Platformda kimliği doğrulanmış her kullanıcı hizmetleri görebilir ve rezervasyon yapabilir. Kulüp üyeliği gerekmez.
- **Private** kulüpler: Sadece onaylı üyeler hizmetleri görebilir ve rezervasyon yapabilir. Keşif listelemesi kulübü "Üyelik başvurusu" çağrısıyla gösterebilir.

Özellik; Tenant veri modelinde bir görünürlük alanı, admin panelde bir ayar, mobil keşif/kulüp akışında moda göre farklılaştırılmış CTA ve akışlar ile backend yetkilendirme değişikliklerini kapsar. Mevcut veriler için güvenli bir migration stratejisi tanımlanır.

## Glossary

- **Platform**: Skyland Wellness çok kiracılı sistemi (backend API + mobil + admin web paneli).
- **Tenant**: Platformda bir iş birimini (kulüp, stüdyo, bağımsız eğitmen çalışma alanı vb.) temsil eden varlık. `tenant` tablosunda tutulur.
- **Partner_Club**: `settings.workspaceType = 'partner_club'` olan tenant. Rezervasyon, kaynak ve üye yönetimi yapan bir spor / wellness kulübüdür.
- **Visibility_Mode**: Bir Partner_Club'ın erişim modeli. Sadece iki değer alabilir: `public` veya `private`.
- **Public_Club**: `visibilityMode = 'public'` olan bir Partner_Club. Platform'daki her kimliği doğrulanmış kullanıcı hizmetlerini görüp rezervasyon yapabilir.
- **Private_Club**: `visibilityMode = 'private'` olan bir Partner_Club. Sadece `active` hesap durumundaki onaylı üyeler hizmetlerini görüp rezervasyon yapabilir.
- **Platform_User**: Platform'da kimliği doğrulanmış (geçerli JWT'ye sahip) herhangi bir kullanıcı. Hangi tenant'ta kayıtlı olduğuna bakılmaksızın.
- **Home_Tenant**: Bir kullanıcının `User.tenantId` alanına eşit olan, kayıt sırasında oluşturulan tenant.
- **Active_Membership**: Belirli bir tenant'ta `accountStatus = 'active'` olan `User` kaydı.
- **Pending_Membership**: Belirli bir tenant'ta `accountStatus = 'pending_approval'` olan `User` kaydı.
- **Rejected_Membership**: Belirli bir tenant'ta `accountStatus = 'rejected'` olan `User` kaydı.
- **Join_Request**: Bir Platform_User'ın bir Private_Club'a üyelik için başvurusu. Sonuçta o tenant içinde `pending_approval` durumunda bir `User` kaydı oluşur.
- **Cross_Tenant_Booking**: Kullanıcının Home_Tenant'ından farklı bir tenant'ta yaptığı rezervasyon.
- **Club_Admin**: Bir tenant'ın `administrator` rolüne sahip kullanıcısı.
- **Platform_Admin**: Tüm platformu yöneten süper kullanıcı (`platform-admin` rolü).
- **Discovery_Service**: Mobil uygulamanın "ClubConnect" ekranını besleyen, kulüp / eğitmen / etkinlik listelerini sağlayan servis (`/discovery/*`).
- **Resource_Booking_Service**: Bir tenant'ın kaynak (kort, oda, terapi odası) ve slot rezervasyonlarını yöneten servis (`/resource-booking/*`).
- **Member_Approval_Guard**: `accountStatus = 'pending_approval'` ise korumalı endpoint'leri engelleyen mevcut NestJS guard'ı (`MemberApprovalGuard`).
- **Membership_Check**: Bir Platform_User'ın belirli bir tenant'ta Active_Membership'ine sahip olup olmadığının doğrulanması.
- **Join_CTA**: Mobil uygulamada private kulüp kartında gösterilen "Üyelik Başvurusu" butonu.
- **Booking_CTA**: Mobil uygulamada public kulüp kartında gösterilen "Rezervasyon Yap" butonu.
- **Enter_CTA**: Zaten Active_Membership'i olan kullanıcılar için gösterilen "Kulübe Git" butonu.

## Requirements

### Requirement 1: Tenant Visibility Model

**User Story:** Platform sahibi olarak, her partner kulüp için public (marketplace) ve private (kapalı topluluk) arasından erişim modeli seçebilmek istiyorum, böylece platform aynı veri modeliyle farklı iş modellerini destekleyebilir.

#### Acceptance Criteria

1. THE Platform SHALL store a `visibilityMode` field on each Partner_Club with exactly one of the values `public` or `private`.
2. THE Platform SHALL reject any write that sets `visibilityMode` to a value other than `public` or `private` with an HTTP 400 validation error.
3. WHEN a Partner_Club is created without an explicit `visibilityMode`, THE Platform SHALL set `visibilityMode` to `private`.
4. THE Platform SHALL expose `visibilityMode` in every `Tenant` read payload returned to Platform_Users, Club_Admins and Platform_Admins.
5. WHERE a Tenant has `settings.workspaceType` different from `partner_club`, THE Platform SHALL ignore `visibilityMode` for authorization and discovery behavior (treated as not applicable).

### Requirement 2: Backward-Compatible Migration

**User Story:** Bir ürün yöneticisi olarak, mevcut partner kulüplerin bu özellik devreye alındığında çalışmaya devam etmesini istiyorum, böylece değişiklik in-flight rezervasyonları ve operasyonu bozmaz.

#### Acceptance Criteria

1. WHEN the `visibilityMode` migration runs, THE Platform SHALL add the `visibility_mode` column to the `tenant` table with a NOT NULL constraint and a default of `private`.
2. WHEN the `visibilityMode` migration runs, THE Platform SHALL set `visibility_mode = 'public'` for the seeded Partner_Club with subdomain `opadel`.
3. WHEN the `visibilityMode` migration runs, THE Platform SHALL leave `visibility_mode = 'private'` for every other existing Partner_Club.
4. WHEN the `visibilityMode` migration runs, THE Platform SHALL NOT modify, cancel, or re-authorize any existing `Booking` records.
5. IF the migration fails mid-execution, THEN THE Platform SHALL roll back all schema and data changes introduced by this migration within the same transaction.

### Requirement 3: Club Admin Visibility Toggle

**User Story:** Bir Club_Admin olarak, admin panelinden kulübümün public veya private modunu değiştirebilmek istiyorum, böylece iş modelimi yönetebilirim.

#### Acceptance Criteria

1. THE Platform SHALL expose `PATCH /admin/tenant/visibility` endpoint that accepts a body `{ visibilityMode: 'public' | 'private' }`.
2. WHEN a request reaches `PATCH /admin/tenant/visibility`, THE Platform SHALL require a valid JWT whose user has the `administrator` role on the target tenant.
3. IF the authenticated user does not have the `administrator` role on the target tenant, THEN THE Platform SHALL reject the request with HTTP 403.
4. WHEN `PATCH /admin/tenant/visibility` succeeds, THE Platform SHALL persist the new `visibilityMode` on the tenant row and return the updated value.
5. WHEN `PATCH /admin/tenant/visibility` succeeds, THE Platform SHALL record an audit log entry containing the tenant id, the acting user id, the previous value and the new value.
6. THE Admin_Web_Panel SHALL display the current `visibilityMode` on the tenant settings page and provide a toggle that calls `PATCH /admin/tenant/visibility`.

### Requirement 4: Public Club Booking Authorization

**User Story:** Bir Platform_User olarak, bir public kulüpte üye olmadan doğrudan rezervasyon yapabilmek istiyorum, böylece tek seferlik misafir olarak hizmet alabilirim.

#### Acceptance Criteria

1. WHEN a Platform_User sends `GET /resource-booking/resources?tenant={subdomain}` for a Public_Club, THE Resource_Booking_Service SHALL return the resource list regardless of whether the user has an Active_Membership in that tenant.
2. WHEN a Platform_User sends `GET /resource-booking/slots?tenant={subdomain}` for a Public_Club, THE Resource_Booking_Service SHALL return available slots regardless of whether the user has an Active_Membership in that tenant.
3. WHEN a Platform_User sends `POST /resource-booking/book?tenant={subdomain}` for a Public_Club, THE Resource_Booking_Service SHALL create the booking regardless of whether the user has an Active_Membership in that tenant.
4. WHEN a booking is created by a Platform_User without an Active_Membership in the target Public_Club, THE Resource_Booking_Service SHALL persist the booking with `tenantId` set to the Public_Club id and `userId` set to the booking user's id.
5. THE Resource_Booking_Service SHALL NOT require the booking user to have an Active_Membership in the target Public_Club before creating the booking.

### Requirement 5: Private Club Booking Authorization

**User Story:** Bir Club_Admin olarak private kulübümde sadece onaylı üyelerimin rezervasyon yapmasını istiyorum, böylece topluluğun kapalılığı korunur.

#### Acceptance Criteria

1. WHEN a Platform_User sends `GET /resource-booking/resources?tenant={subdomain}` for a Private_Club, THE Resource_Booking_Service SHALL perform a Membership_Check and return the resource list only if the user has an Active_Membership in that tenant.
2. WHEN a Platform_User sends `GET /resource-booking/slots?tenant={subdomain}` for a Private_Club, THE Resource_Booking_Service SHALL perform a Membership_Check and return available slots only if the user has an Active_Membership in that tenant.
3. WHEN a Platform_User sends `POST /resource-booking/book?tenant={subdomain}` for a Private_Club, THE Resource_Booking_Service SHALL perform a Membership_Check before creating the booking.
4. IF the Membership_Check fails for a Private_Club booking request, THEN THE Resource_Booking_Service SHALL reject the request with HTTP 403 and an error code `private_club_membership_required`.
5. IF a user has a Pending_Membership but not an Active_Membership in a Private_Club, THEN THE Resource_Booking_Service SHALL reject `GET /resource-booking/resources`, `GET /resource-booking/slots` and `POST /resource-booking/book` for that tenant with HTTP 403.
6. IF a user has a Rejected_Membership in a Private_Club, THEN THE Resource_Booking_Service SHALL reject `GET /resource-booking/resources`, `GET /resource-booking/slots` and `POST /resource-booking/book` for that tenant with HTTP 403.

### Requirement 6: Discovery Listing Behavior

**User Story:** Platformu keşfeden bir kullanıcı olarak, her kulübü ilgili aksiyon çağrısıyla görmek istiyorum, böylece public kulüpte hemen rezervasyon yapabilir, private kulüpte üyelik başvurusunda bulunabilirim.

#### Acceptance Criteria

1. THE Discovery_Service SHALL include every Partner_Club (public and private) in `GET /discovery/clubs` response regardless of the requester's memberships.
2. THE Discovery_Service SHALL include the `visibilityMode` field for each Partner_Club in the `GET /discovery/clubs` response.
3. WHEN the Discovery_Service returns a Private_Club entry, THE Discovery_Service SHALL include only the public-safe fields (`id`, `name`, `subdomain`, `description`, `location`, `logoUrl`, `coverImageUrl`, `services`, `priceRange`, `featured`, `avgRating`, `reviewCount`, `phone`, `email`, `visibilityMode`) and SHALL NOT include resource prices, slot availability, or addon lists.
4. THE Mobile_Member_App SHALL render the Booking_CTA on a Public_Club card.
5. WHEN the authenticated user has an Active_Membership in a Private_Club, THE Mobile_Member_App SHALL render the Enter_CTA on that club card.
6. WHEN the authenticated user does not have an Active_Membership in a Private_Club, THE Mobile_Member_App SHALL render the Join_CTA on that club card.
7. WHEN the authenticated user has a Pending_Membership in a Private_Club, THE Mobile_Member_App SHALL render a disabled CTA labeled "Onay bekleniyor".
8. WHEN the authenticated user has a Rejected_Membership in a Private_Club, THE Mobile_Member_App SHALL render a disabled CTA labeled "Başvuru reddedildi".

### Requirement 7: Private Club Join Request

**User Story:** Bir Platform_User olarak, bir private kulübe üyelik başvurusu yapabilmek istiyorum, böylece onaylanırsam kulübün hizmetlerinden yararlanabilirim.

#### Acceptance Criteria

1. THE Platform SHALL expose `POST /tenants/{subdomain}/join-requests` endpoint that accepts an authenticated Platform_User and an optional `{ message?: string }` body.
2. WHEN a Platform_User sends a Join_Request to a Public_Club, THE Platform SHALL reject the request with HTTP 400 and an error code `club_is_public`.
3. WHEN a Platform_User sends a Join_Request to a Private_Club and has no existing `User` row for that tenant, THE Platform SHALL create a new `User` row in that tenant with `role = 'member'` and `accountStatus = 'pending_approval'`.
4. WHEN a Platform_User sends a Join_Request to a Private_Club and already has a `User` row with `accountStatus = 'pending_approval'` in that tenant, THE Platform SHALL return HTTP 200 with the existing pending record and SHALL NOT create a duplicate row.
5. WHEN a Platform_User sends a Join_Request to a Private_Club and already has a `User` row with `accountStatus = 'active'` in that tenant, THE Platform SHALL reject the request with HTTP 409 and an error code `already_member`.
6. IF a Platform_User sends a Join_Request to a Private_Club and already has a `User` row with `accountStatus = 'rejected'` in that tenant, THEN THE Platform SHALL reject the request with HTTP 403 and an error code `membership_rejected`.
7. WHEN a Join_Request is accepted by a Club_Admin, THE Platform SHALL set the corresponding user's `accountStatus` to `active`.
8. WHEN a Join_Request is rejected by a Club_Admin, THE Platform SHALL set the corresponding user's `accountStatus` to `rejected`.

### Requirement 8: Cross-Tenant Booking Attribution

**User Story:** Bir ürün yöneticisi olarak, public bir kulüpte misafir rezervasyonu yapan kullanıcının rezervasyonunun hangi tenant'a ait olduğunu net görebilmek istiyorum, böylece ciro, iptal ve iletişim doğru tenant üzerinden yürütülebilir.

#### Acceptance Criteria

1. WHEN a Platform_User creates a booking at a Public_Club AND the booking user's Home_Tenant is different from the Public_Club, THE Resource_Booking_Service SHALL set `Booking.tenantId` to the Public_Club id.
2. WHEN a Platform_User creates a booking at a Public_Club AND the booking user's Home_Tenant is different from the Public_Club, THE Resource_Booking_Service SHALL set `Booking.userId` to the booking user's id from the Home_Tenant and SHALL NOT create a new `User` row in the Public_Club.
3. WHEN a Club_Admin of a Public_Club queries `GET /resource-booking/admin/bookings`, THE Resource_Booking_Service SHALL include bookings made by Platform_Users whose Home_Tenant differs from the Public_Club.
4. WHEN a booking is created by a cross-tenant user, THE Platform SHALL send the booking confirmation notification (push, SMS, email) to the user's contact details stored in the user's Home_Tenant.
5. THE Platform SHALL NOT grant the booking user any new role or membership in the Public_Club as a result of a Cross_Tenant_Booking.

### Requirement 9: Visibility Change Semantics

**User Story:** Bir Club_Admin olarak, kulübümün visibility modunu değiştirdiğimde mevcut rezervasyon ve üyeliklere ne olduğunu önceden bilmek istiyorum, böylece üyelerimi ve gelirimi güvenli şekilde yönetebilirim.

#### Acceptance Criteria

1. WHEN a Club_Admin switches a tenant's `visibilityMode` from `public` to `private`, THE Platform SHALL preserve all existing `Booking` records with their current `status` unchanged.
2. WHEN a Club_Admin switches a tenant's `visibilityMode` from `public` to `private`, THE Platform SHALL keep every existing `User` row in that tenant with its current `accountStatus` unchanged.
3. WHEN a Club_Admin switches a tenant's `visibilityMode` from `private` to `public`, THE Platform SHALL keep every existing `User` row in that tenant with its current `accountStatus` unchanged.
4. WHEN a Club_Admin switches a tenant's `visibilityMode` from `private` to `public`, THE Platform SHALL NOT auto-approve users with `accountStatus = 'pending_approval'`.
5. WHEN a Club_Admin switches a tenant's `visibilityMode`, THE Platform SHALL apply the new authorization rules defined in Requirement 4 and Requirement 5 to all subsequent resource-booking requests.
6. WHEN a Club_Admin switches a tenant's `visibilityMode` back to the same value it already has, THE Platform SHALL return HTTP 200 and SHALL NOT write a new audit log entry (idempotent toggle).

### Requirement 10: Trainer Cross-Tenant Access

**User Story:** A Club A'daki bir trainer olarak, public bir B kulübünün hizmetlerinden misafir olarak yararlanmak istiyorum, ancak private B kulübünün içeriğine yetkim olmamalı.

#### Acceptance Criteria

1. WHEN a user with role `trainer` or `independent_trainer` is a Platform_User and sends `POST /resource-booking/book?tenant={subdomain}` for a Public_Club, THE Resource_Booking_Service SHALL treat the user as a Platform_User and apply the Public_Club rules from Requirement 4.
2. WHEN a user with role `trainer` or `independent_trainer` sends `POST /resource-booking/book?tenant={subdomain}` for a Private_Club, THE Resource_Booking_Service SHALL apply the Private_Club rules from Requirement 5 exactly as for any other Platform_User.
3. THE Platform SHALL NOT grant any elevated access to a trainer in a Private_Club solely because the user has a trainer role in another tenant.

### Requirement 11: Auth `my-memberships` Consistency

**User Story:** Bir kullanıcı olarak, kulüp kartında doğru CTA'yı görmem için, mobil uygulamanın hangi kulüplerde üye olduğumu doğru bilmesini istiyorum.

#### Acceptance Criteria

1. THE `/auth/my-memberships` endpoint SHALL include the `visibilityMode` field for each returned tenant.
2. THE `/auth/my-memberships` endpoint SHALL include the caller's `accountStatus` for each returned membership.
3. WHEN the caller has multiple `User` rows across tenants with the same email, THE `/auth/my-memberships` endpoint SHALL return one entry per tenant.

### Requirement 12: Platform Admin Override

**User Story:** Bir Platform_Admin olarak, gerekirse bir tenant'ın visibility modunu değiştirebilmek istiyorum, böylece destek operasyonlarını yürütebilirim.

#### Acceptance Criteria

1. WHEN a Platform_Admin sends `PATCH /platform-admin/tenants/{id}/visibility` with a body `{ visibilityMode: 'public' | 'private' }`, THE Platform SHALL persist the change on the target tenant.
2. WHEN a Platform_Admin changes a tenant's `visibilityMode`, THE Platform SHALL record an audit log entry with the tenant id, acting platform admin id, previous value and new value.
3. IF a non-Platform_Admin user calls `PATCH /platform-admin/tenants/{id}/visibility`, THEN THE Platform SHALL reject the request with HTTP 403 and SHALL NOT modify the target tenant's `visibilityMode` or write an audit log entry.

## Correctness Properties for Property-Based Testing

The properties below MUST be exercised by property-based tests in the implementation phase. Each property includes a brief rationale describing why it is a valid correctness property.

### P1: Visibility Invariant

For every `Tenant` row returned by `GET /discovery/clubs`, `visibilityMode ∈ { 'public', 'private' }`. This invariant guarantees the two-valued enum contract assumed by every consumer (mobile CTA logic, backend authorization).

### P2: Booking Authorization Invariant

For every `(user, tenant)` pair and every call to `POST /resource-booking/book?tenant={tenant.subdomain}`:

- IF `tenant.visibilityMode = 'public'`, THEN the authorization decision SHALL be `allow` regardless of the user's memberships in `tenant`.
- IF `tenant.visibilityMode = 'private'`, THEN the authorization decision SHALL be `allow` iff the user has a `User` row in `tenant` with `accountStatus = 'active'`.

This is the core security property of the feature.

### P3: Join Request Idempotence

For any `(user, private_tenant)` pair, calling `POST /tenants/{private_tenant.subdomain}/join-requests` N times (N ≥ 1) SHALL result in at most one `User` row in `private_tenant` where `email = user.email` and `accountStatus = 'pending_approval'`. Idempotence protects against client retries and accidental double-taps.

### P4: Visibility Toggle Round-Trip

For any Partner_Club `t` with initial `visibilityMode = v`, applying toggle sequence `v → v' → v` SHALL leave `t.visibilityMode = v` and SHALL NOT modify any `User.accountStatus` or `Booking.status` in `t`. This property confirms that visibility toggling is a pure function over tenant metadata.

### P5: Cross-Tenant Booking Attribution

For any Public_Club `p` and any Platform_User `u` whose Home_Tenant ≠ `p.id`, after a successful `POST /resource-booking/book?tenant=p.subdomain`:

- The created `Booking` SHALL satisfy `booking.tenantId = p.id AND booking.userId = u.id`.
- No new `User` row SHALL be created in `p` as a result of the booking.

This property guarantees correct attribution for billing and operations.

### P6: Membership Check Confluence

For a Private_Club `t`, the authorization outcome for any endpoint in the set `{ GET /resource-booking/resources, GET /resource-booking/slots, POST /resource-booking/book }` with parameter `tenant = t.subdomain` SHALL depend only on `(user.id, t.id, user.accountStatus-in-t, t.visibilityMode)` and SHALL NOT depend on request ordering or prior requests. This property guarantees that the authorization function is stateless and order-independent.

### P7: Migration Safety

After running the Requirement 2 migration on any initial database state, for every pre-existing `Tenant` row with `settings.workspaceType = 'partner_club'` and subdomain ≠ `opadel`, `tenant.visibilityMode` SHALL be `private`. This property guarantees a conservative default for existing data.
