# Requirements Document

## Introduction

İşlem Merkezi (Transaction Center), web-admin panelinde kulüp yöneticilerinin tüm üye hizmet geçmişini (masaj, PT, padel, kafe, etkinlik) tek bir merkezi ekrandan görüntüleyebileceği, filtreleyebileceği ve raporlayabileceği bir özelliktir. Multi-tenant SaaS mimarisine uygun şekilde her kulüp yalnızca kendi verilerine erişebilir.

## Glossary

- **Transaction_Center**: Web-admin panelinde yer alan, üye hizmet geçmişini gösteren bağımsız sayfa
- **Transaction**: Bir üyenin kulüpte aldığı herhangi bir hizmet kaydı (masaj seansı, PT seansı, padel rezervasyonu, kafe siparişi, etkinlik katılımı)
- **Service_Type**: İşlem türü; massage, personal_training, padel, cafe, event değerlerinden biri
- **Summary_Card**: Bir üyeye ait özet bilgileri gösteren istatistik kartı (toplam harcama, seans sayısı, son ziyaret)
- **Member_Search**: Üye adına veya soyadına göre arama yapan autocomplete bileşeni
- **Transaction_Table**: İşlemleri kronolojik sırada gösteren filtrelenebilir tablo
- **Date_Range_Filter**: Başlangıç ve bitiş tarihi ile işlemleri filtreleyen bileşen
- **PDF_Report**: İşlem geçmişini PDF formatında dışa aktaran rapor
- **Most_Active_Members**: Belirli dönemde en çok işlem yapan üyelerin listesi
- **Member_Detail_Panel**: Mevcut üye detay ekranında yer alan bilgi paneli

## Requirements

### Requirement 1: Sidebar Navigation

**User Story:** As a club admin, I want to access the Transaction Center from the sidebar, so that I can quickly navigate to it from any page.

#### Acceptance Criteria

1. THE Transaction_Center SHALL appear as a standalone menu item labeled "İşlem Merkezi" in the web-admin sidebar navigation, positioned after the existing menu items in both the WELLNESS_NAV and GENERIC_NAV arrays
2. WHEN a club admin clicks the "İşlem Merkezi" menu item, THE Transaction_Center SHALL navigate to the `/transaction-center` route and render the Transaction Center page within 1 second
3. THE Transaction_Center sidebar menu item and `/transaction-center` route SHALL be accessible only to users with the administrator role, enforced via the existing ProtectedRoute with allowedRoles containing 'administrator'
4. IF a user without the administrator role attempts to access the `/transaction-center` route directly via URL, THEN THE Transaction_Center SHALL redirect the user to the login page or display an unauthorized indication without rendering the Transaction Center content

### Requirement 2: Member Search with Autocomplete

**User Story:** As a club admin, I want to search for members with fast autocomplete, so that I can quickly find a specific member's transaction history.

#### Acceptance Criteria

1. THE Member_Search SHALL display a text input at the top of the Transaction_Center page
2. WHEN the club admin types at least 2 characters, THE Member_Search SHALL debounce the input for 300ms and then display matching members within 300ms of the debounced request being sent
3. THE Member_Search SHALL match against member first name, last name, and email fields using case-insensitive prefix matching
4. THE Member_Search SHALL display a maximum of 10 matching members in the autocomplete dropdown, showing each member's full name and email
5. WHEN the club admin selects a member from the autocomplete results, THE Transaction_Table SHALL filter to show only that member's transactions and THE Member_Search input SHALL display the selected member's full name
6. WHEN the club admin clears the Member_Search input, THE Transaction_Table SHALL show all transactions for the club
7. IF the Member_Search input contains fewer than 2 characters, THEN THE Member_Search SHALL hide the autocomplete dropdown and not send a search request
8. IF the search request fails or times out after 5 seconds, THEN THE Member_Search SHALL display an inline error message indicating the search is unavailable and preserve the current input text
9. WHILE the search request is in progress, THE Member_Search SHALL display a loading indicator within the input field
10. IF the search returns no matching members, THEN THE Member_Search SHALL display a "No members found" message in the autocomplete dropdown

### Requirement 3: Unified Transaction Table

**User Story:** As a club admin, I want to see all service history in a single table, so that I can get a complete view of member activities.

#### Acceptance Criteria

1. THE Transaction_Table SHALL display transactions from all service types: massage, personal_training, padel, cafe, event
2. THE Transaction_Table SHALL show the following columns: date, member name, service type, description, amount (₺), status
3. THE Transaction_Table SHALL sort transactions by date in descending order by default
4. THE Transaction_Table SHALL paginate results with 25 items per page
5. WHEN no transactions match the current filters, THE Transaction_Table SHALL display an empty state message indicating that no transactions were found for the selected filter criteria
6. THE Transaction_Table SHALL display the status column using one of the following values: pending, succeeded, failed, refunded
7. WHEN the admin navigates to a page beyond the first, THE Transaction_Table SHALL display a pagination control showing the current page number and total page count, and allow navigation to the previous and next pages
8. IF the transaction data fails to load, THEN THE Transaction_Table SHALL display an error message indicating that transactions could not be retrieved and provide a retry option

### Requirement 4: Date Range and Service Type Filters

**User Story:** As a club admin, I want to filter transactions by date range and service type, so that I can analyze specific periods and services.

#### Acceptance Criteria

1. THE Date_Range_Filter SHALL provide start date and end date picker inputs that accept dates in DD.MM.YYYY format and restrict selection to dates no earlier than 1 year before the current date and no later than the current date
2. WHEN the club admin selects a date range, THE Transaction_Table SHALL display only transactions whose transaction date falls within the selected start and end dates (inclusive of both boundary dates)
3. THE Transaction_Center SHALL provide a Service_Type dropdown filter with options: Tümü, Masaj, PT, Padel, Kafe, Etkinlik, where "Tümü" is selected by default and displays transactions of all service types
4. WHEN the club admin selects a service type other than "Tümü", THE Transaction_Table SHALL display only transactions matching that service type
5. WHEN both date range and service type filters are active, THE Transaction_Table SHALL display only transactions that satisfy both filter conditions simultaneously (logical AND)
6. THE Transaction_Center SHALL apply filters within 2 seconds without requiring a page reload, updating the Transaction_Table content in place
7. IF the club admin selects a start date that is later than the end date, THEN THE Date_Range_Filter SHALL display an inline validation message indicating the invalid range and SHALL NOT submit the filter request
8. IF the applied filters return no matching transactions, THEN THE Transaction_Table SHALL display an empty state message indicating that no transactions match the selected filters

### Requirement 5: Summary Cards

**User Story:** As a club admin, I want to see summary statistics for a selected member, so that I can understand their engagement at a glance.

#### Acceptance Criteria

1. WHEN a member is selected via Member_Search, THE Transaction_Center SHALL display Summary_Cards above the Transaction_Table within 2 seconds of selection
2. THE Summary_Cards SHALL show the total spending amount formatted in Turkish Lira (₺) with two decimal places and thousands separators using Turkish locale (e.g., ₺12.500,00), calculated as the sum of all completed payment transactions for the selected member within the active Date_Range_Filter
3. THE Summary_Cards SHALL show the total number of sessions as an integer count of massage, PT, and padel bookings combined for the selected member within the active Date_Range_Filter
4. THE Summary_Cards SHALL show the date of the member's last visit formatted in dd.MM.yyyy Turkish locale, representing the most recent completed booking date within the active Date_Range_Filter
5. WHEN the Date_Range_Filter value changes, THE Summary_Cards SHALL recalculate all displayed values to reflect only transactions and bookings within the updated date range within 2 seconds
6. WHEN no member is selected, THE Transaction_Center SHALL hide the Summary_Cards section entirely, displaying no placeholder or empty state in its place
7. IF the selected member has no transactions or bookings within the active Date_Range_Filter, THEN THE Summary_Cards SHALL display ₺0,00 for total spending, 0 for total sessions, and a dash character (—) for last visit date

### Requirement 6: PDF Export

**User Story:** As a club admin, I want to export the transaction list as a PDF, so that I can share reports with management or archive them.

#### Acceptance Criteria

1. THE Transaction_Center SHALL display a "PDF İndir" button that is visible without scrolling within the action bar area
2. WHEN the club admin clicks the "PDF İndir" button, THE PDF_Report SHALL generate a document containing all transactions matching the currently applied filters, with a maximum of 500 transactions per export
3. THE PDF_Report SHALL include the club name, export date formatted as DD.MM.YYYY HH:mm, a summary of applied filters (date range, transaction type, member name), and a table of transaction data (date, member name, transaction type, amount, status)
4. THE PDF_Report SHALL be generated client-side within 10 seconds for up to 500 transactions and downloaded automatically to the admin's device without requiring a server round-trip
5. IF the filtered transaction list is empty, THEN THE Transaction_Center SHALL display the "PDF İndir" button in a disabled state with a visual indicator that export is unavailable
6. IF PDF generation fails due to a client-side error, THEN THE Transaction_Center SHALL display an error message indicating the export could not be completed and preserve the current page state

### Requirement 7: Most Active Members

**User Story:** As a club admin, I want to see a list of the most active members, so that I can identify high-value members and reward loyalty.

#### Acceptance Criteria

1. THE Transaction_Center SHALL display a "En Aktif Üyeler" section positioned as a sidebar or panel visible alongside the Transaction_Table
2. THE Most_Active_Members list SHALL show the top 10 members ranked by total transaction count within the active Date_Range_Filter range, with ties broken by total spending in descending order
3. THE Most_Active_Members list SHALL display each member's full name (first + last), total transaction count, and total spending formatted in Turkish Lira (₺) with thousands separator
4. WHEN the club admin clicks a member in the Most_Active_Members list, THE Member_Search SHALL populate with that member's name and THE Transaction_Table SHALL filter to show only that member's transactions
5. WHEN the Date_Range_Filter changes, THE Most_Active_Members list SHALL recalculate rankings based on the new date range within 500ms of filter application
6. IF no Date_Range_Filter is active, THEN THE Most_Active_Members list SHALL calculate rankings based on all available transaction data for the tenant
7. IF fewer than 10 members have transactions within the active date range, THEN THE Most_Active_Members list SHALL display only those members who have at least 1 transaction

### Requirement 8: Last 5 Transactions in Member Detail Panel

**User Story:** As a club admin, I want to see recent transactions on the member detail page, so that I can get quick context without navigating away.

#### Acceptance Criteria

1. THE Member_Detail_Panel SHALL display a "Son 5 İşlem" section showing the member's 5 most recent payment transactions ordered by transaction date descending
2. WHEN there are fewer than 5 transactions for the member, THE Member_Detail_Panel SHALL display only the available transactions without placeholder rows
3. IF the member has no transactions, THEN THE Member_Detail_Panel SHALL display an empty-state message indicating no transactions exist in the "Son 5 İşlem" section
4. THE "Son 5 İşlem" section SHALL show transaction date (formatted as DD.MM.YYYY), package type name as service type, and amount with currency (e.g. "250,00 TRY") for each transaction
5. THE Member_Detail_Panel SHALL display a "İşlem Merkezi'ne Git" link below the "Son 5 İşlem" section
6. WHEN the club admin clicks "İşlem Merkezi'ne Git", THE system SHALL navigate to the Transaction_Center with that member's identifier pre-selected in the Member_Search field so that only that member's transactions are listed

### Requirement 9: Multi-Tenant Data Isolation

**User Story:** As a platform operator, I want transaction data to be isolated per tenant, so that clubs cannot see each other's data.

#### Acceptance Criteria

1. WHEN an authenticated admin requests the transaction list, THE Transaction_Center SHALL display only transactions belonging to users whose tenantId matches the admin's own tenantId
2. THE backend API SHALL enforce tenant filtering on all transaction queries at the database query level by joining or filtering on the user's tenantId, ensuring no query can return rows belonging to a different tenant
3. IF a request is made without valid tenant context (missing or unresolvable X-Tenant-Subdomain header, or no authenticated session), THEN THE backend API SHALL reject the request and return an error response indicating missing tenant context within 500 milliseconds
4. IF a valid authenticated admin attempts to supply a tenantId different from their own in query parameters or request body, THEN THE backend API SHALL ignore the supplied value and enforce the admin's own tenantId from the authenticated session
5. WHEN the Transaction_Center loads transaction data, THE backend API SHALL return a maximum of 100 transactions per page and SHALL NOT include any transaction where the associated user's tenantId differs from the requesting admin's tenantId
