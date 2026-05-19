# Requirements Document

## Introduction

ClubProfilePage'in (partner profil sayfası) tüm partner tipleri için profesyonel, tutarlı ve modern bir şablona dönüştürülmesi. Sayfa yapısı: hero slider + galeri thumbnails, kulüp identity header, sticky section navigator (Instagram highlights tarzı yuvarlak ikonlar), ve aşağıda detay bölümleri. Mevcut Stripe checkout akışı korunacak. Mesaj sistemi mevcut chat altyapısını kullanacak.

## Glossary

- **Profile_Page**: `/club/:subdomain` rotasındaki partner profil sayfası
- **Partner**: Platformda hizmet sunan işletme (kulüp, spa, padel, stüdyo, salon, bağımsız eğitmen)
- **Hero_Slider**: Sayfa üstündeki tam genişlik galeri kaydırıcı + thumbnail strip
- **Section_Navigator**: Sticky yuvarlak ikon navigasyonu (Instagram highlights)
- **Booking_Flow**: Hizmet seçimi → slot → addon → sipariş özeti → Stripe checkout
- **Chat_Redirect**: Mevcut mesajlaşma sistemine yönlendiren buton

## Requirements

### Requirement 1: Hero Slider + Gallery Thumbnails

**User Story:** As a visitor, I want to see attractive images and browse the full gallery from the slider area.

#### Acceptance Criteria

1. WHEN the Profile_Page loads, THE Hero_Slider SHALL display gallery images in a full-width carousel
2. BELOW the slider, THE Profile_Page SHALL display small thumbnail previews of all gallery images
3. WHEN a user taps a thumbnail, THE Profile_Page SHALL open a full-screen lightbox viewer
4. WHEN no gallery images exist, THE Hero_Slider SHALL display the cover image or a branded placeholder
5. THE Hero_Slider SHALL support touch swipe and arrow navigation
6. THE Hero_Slider height SHALL be 360px desktop, 220px mobile

### Requirement 2: Partner Identity Header

**User Story:** As a visitor, I want to quickly identify the partner's name, location, and rating.

#### Acceptance Criteria

1. THE Profile_Page SHALL display partner logo, name, location, rating, and review count below the Hero_Slider
2. THE Profile_Page SHALL display social proof metrics (üye, randevu, eğitmen sayısı) in a compact bar
3. WHEN a user is authenticated, THE Profile_Page SHALL display a favorite toggle and "Kulübe Mesaj At" button

### Requirement 3: Sticky Section Navigator

**User Story:** As a visitor, I want circular navigation icons that stay visible as I scroll.

#### Acceptance Criteria

1. THE Section_Navigator SHALL render circular icons: Hakkımızda, Değerlendirmeler, Eğitmenler, Etkinlikler, Kampanyalar, Hizmetler & Rezervasyon, Mesaj
2. THE Section_Navigator SHALL become sticky (position: sticky) when scrolled past its original position
3. WHEN a section has no data, THE Section_Navigator SHALL hide that icon
4. WHEN a user taps an icon, THE Profile_Page SHALL smooth-scroll to that section
5. THE Section_Navigator SHALL highlight the currently visible section's icon
6. THE Section_Navigator SHALL be horizontally scrollable on mobile

### Requirement 4: Hakkımızda (About Us) Section

**User Story:** As a visitor, I want to learn about the partner and their working hours.

#### Acceptance Criteria

1. THE Profile_Page SHALL display the partner's description text
2. WHEN working hours are available (from tenant settings), display formatted schedule
3. THE Profile_Page SHALL display service tags as chips
4. IF no description exists, hide this section

### Requirement 5: Değerlendirmeler (Reviews) Section

**User Story:** As a visitor, I want to see ratings and reviews to build trust.

#### Acceptance Criteria

1. THE Profile_Page SHALL display average rating, review count, and star distribution
2. THE Profile_Page SHALL display recent reviews with user avatar, name, rating, comment, date
3. WHEN authenticated, THE Profile_Page SHALL allow submitting a new review (1-5 stars + comment)
4. IF no reviews exist, THE Profile_Page SHALL show a prompt to leave the first review

### Requirement 6: Etkinlikler (Events) Section

**User Story:** As a visitor, I want to browse upcoming events.

#### Acceptance Criteria

1. WHEN upcoming events exist, display event cards in a horizontal scroll
2. Each card SHALL show title, image, date, coach, location
3. Tapping a card navigates to /event/:id
4. IF no events exist, hide this section

### Requirement 7: Kampanyalar (Campaigns) Section

**User Story:** As a visitor, I want to see active promotions.

#### Acceptance Criteria

1. WHEN active campaigns exist, display campaign cards with title, discount badge, prices, expiry
2. IF no campaigns exist, hide this section

### Requirement 8: Hizmetler & Rezervasyon (Services + Booking)

**User Story:** As a visitor, I want to see services and book directly from the same section.

#### Acceptance Criteria

1. THE Profile_Page SHALL display services grouped by category with price, duration
2. WHEN packages exist, display package cards with "Satın Al" button (Stripe checkout)
3. THE Booking_Flow SHALL be embedded inline: service dropdown → week/day tabs → slots → addon step → order summary → checkout
4. THE order summary panel SHALL show full breakdown before checkout
5. IF user is not authenticated, show login/register prompts

### Requirement 9: Eğitmenler (Trainers) Section

**User Story:** As a visitor, I want to see the club's trainers with their photos, ratings, and specialties, so I can choose who to work with.

#### Acceptance Criteria

1. WHEN the partner has trainers, THE Profile_Page SHALL display trainer cards in a grid layout
2. Each trainer card SHALL show: photo (or initials), name, rating, total sessions, specializations
3. WHEN a user taps a trainer card, THE Profile_Page SHALL navigate to `/trainer/:trainerId`
4. THE Profile_Page SHALL separate trainers by type (PT eğitmenleri vs masözler) when both exist
5. IF no trainers exist, hide this section and its navigator icon

### Requirement 10: Mesaj Gönder (Chat Redirect)

**User Story:** As a visitor, I want to message the partner directly.

#### Acceptance Criteria

1. THE Profile_Page SHALL display a "💬 Kulübe Mesaj At" button
2. WHEN an authenticated user taps the button, THE Profile_Page SHALL call the chat API and redirect to the messages tab or open inline chat
3. IF user is not authenticated, show login prompt

### Requirement 11: Unified Template + Responsive

**User Story:** As the platform, all partner types use the same template, adapting gracefully.

#### Acceptance Criteria

1. THE Profile_Page SHALL use identical layout for all verticals
2. Sections with no data SHALL be hidden (no empty placeholders)
3. THE Profile_Page SHALL be responsive (320px–1440px)
4. THE Profile_Page SHALL use the dark theme design system (koyu tema)
