# Requirements Document

## Introduction

This document defines the UX/UI improvement requirements for the Wellness Club mobile app (Expo SDK 54, React Native). The improvements cover three areas: (1) a guided onboarding experience for new members, (2) loading and empty state feedback patterns, and (3) user-friendly error handling with offline awareness. The goal is to replace raw `Alert.alert()` calls and bare `ActivityIndicator` spinners with polished, informative UI that builds trust and reduces user confusion.

## Glossary

- **App**: The Wellness Club mobile application built with Expo SDK 54 and React Native 0.81.5
- **Onboarding_Flow**: The sequence of screens a new user sees from first launch to club membership activation (ClubConnect → RegistrationType → Register → PendingApproval)
- **Skeleton_Loader**: A placeholder UI component that mimics the shape of content while data is being fetched, using animated shimmer effects
- **Empty_State**: A UI view displayed when a list or section has no data to show, containing an illustration/icon, descriptive message, and optional action button
- **Error_Banner**: A non-blocking, dismissible UI component displayed inline within the screen to communicate errors without interrupting user flow
- **Toast**: A brief, auto-dismissing notification message shown at the top or bottom of the screen
- **Offline_Indicator**: A persistent visual element that informs the user the device has no network connectivity
- **Retry_Button**: A tappable UI element that re-triggers a failed network request
- **API_Client**: The `apiJson` function in `src/api/client.ts` that handles all HTTP communication with the backend
- **Member**: An authenticated user with an active or pending club membership
- **Tenant**: A club/organization in the multi-tenant SaaS platform

## Requirements

### Requirement 1: Onboarding Welcome Carousel

**User Story:** As a new user opening the app for the first time, I want to see a brief introduction explaining the app's value, so that I understand what the platform offers before selecting a club.

#### Acceptance Criteria

1. WHEN the App detects a first-time launch (no stored session), THE Onboarding_Flow SHALL display a swipeable welcome carousel before the ClubConnect screen
2. THE welcome carousel SHALL contain between 3 and 5 slides, each with an illustration, a headline, and a short description
3. WHEN the user taps the "Skip" button on any carousel slide, THE Onboarding_Flow SHALL navigate directly to the ClubConnect screen
4. WHEN the user reaches the last carousel slide and taps the primary action button, THE Onboarding_Flow SHALL navigate to the ClubConnect screen
5. THE welcome carousel SHALL display a page indicator showing the current slide position out of total slides
6. WHEN the user has completed or skipped the carousel, THE App SHALL persist this state so the carousel is not shown on subsequent launches

### Requirement 2: Club Selection Guidance

**User Story:** As a new member, I want clear step-by-step guidance during club selection, so that I understand the process and feel confident choosing the right club.

#### Acceptance Criteria

1. WHEN the ClubConnect screen loads for a first-time user, THE Onboarding_Flow SHALL display a brief tooltip or highlight explaining how to select a club
2. THE ClubConnect screen SHALL display a progress indicator showing the user's current step in the onboarding process (e.g., "Step 1 of 3: Choose your club")
3. WHEN the user selects a club and proceeds to registration, THE Onboarding_Flow SHALL display a progress indicator updated to reflect the current step
4. WHEN the user completes registration and enters pending approval state, THE Onboarding_Flow SHALL display a clear explanation of what happens next and expected wait time

### Requirement 3: Skeleton Loaders for Data Sections

**User Story:** As a member, I want to see placeholder content while data loads, so that I know the app is working and can anticipate the layout of incoming content.

#### Acceptance Criteria

1. WHILE the MemberHomeScreen is fetching packages, reservations, or trainers data, THE App SHALL display Skeleton_Loader components matching the shape of the expected content
2. WHILE the MemberHomeScreen is fetching club events, THE App SHALL display Skeleton_Loader cards matching the horizontal event card layout
3. WHILE the MemberHomeScreen is fetching massage slot availability, THE App SHALL display Skeleton_Loader components matching the slot card layout
4. WHILE the MemberHomeScreen is fetching cafe orders, THE App SHALL display a Skeleton_Loader matching the order list layout
5. THE Skeleton_Loader SHALL use an animated shimmer effect with colors derived from the premium theme (bg0, bg1, glass tokens)
6. WHEN data fetching completes successfully, THE App SHALL replace the Skeleton_Loader with actual content within one render cycle
7. WHILE the MemberEventsScreen is fetching event data, THE App SHALL display Skeleton_Loader components matching the event list layout
8. WHILE the MemberReservationsScreen is fetching reservation data, THE App SHALL display Skeleton_Loader components matching the reservation list layout

### Requirement 4: Empty State Messages

**User Story:** As a member, I want to see helpful messages when a section has no data, so that I understand why it's empty and what I can do about it.

#### Acceptance Criteria

1. WHEN the reservations list contains zero items, THE App SHALL display an Empty_State with an icon, a message explaining no reservations exist, and a button to navigate to booking
2. WHEN the club events list contains zero upcoming events, THE App SHALL display an Empty_State with an icon and a message indicating no upcoming events are scheduled
3. WHEN the massage slots section has zero available slots for today, THE App SHALL display an Empty_State with a message and a suggestion to check another day
4. WHEN the cafe orders list contains zero orders, THE App SHALL display an Empty_State with an icon and a message encouraging the user to explore the menu
5. WHEN the notifications list contains zero items, THE App SHALL display an Empty_State with a message indicating no notifications
6. THE Empty_State component SHALL support an optional action button with a configurable label and navigation target
7. THE Empty_State messages SHALL be localized using the i18next translation system for both Turkish and English locales

### Requirement 5: Inline Error Display

**User Story:** As a member, I want to see error messages within the screen context instead of blocking alert dialogs, so that I can understand what went wrong without losing my place.

#### Acceptance Criteria

1. WHEN a non-critical API request fails on the MemberHomeScreen, THE App SHALL display an Error_Banner inline within the affected section instead of showing an Alert dialog
2. THE Error_Banner SHALL display a user-friendly localized error message, an error icon, and a Retry_Button
3. WHEN the user taps the Retry_Button on an Error_Banner, THE App SHALL re-attempt the failed request and show a loading indicator on the button
4. WHEN the retry request succeeds, THE App SHALL dismiss the Error_Banner and display the fetched content
5. IF a critical authentication error occurs (HTTP 401), THEN THE App SHALL redirect the user to the login screen and display a Toast explaining the session has expired
6. THE Error_Banner SHALL be dismissible by the user via a close button or swipe gesture

### Requirement 6: Offline State Handling

**User Story:** As a member using the app without internet, I want to be clearly informed about my connectivity status, so that I understand why content isn't loading and know when I can retry.

#### Acceptance Criteria

1. WHEN the device loses network connectivity, THE App SHALL display an Offline_Indicator banner at the top of the screen within 2 seconds of connectivity loss
2. WHILE the device has no network connectivity, THE Offline_Indicator SHALL remain visible across all screens
3. WHEN the device regains network connectivity, THE App SHALL dismiss the Offline_Indicator within 2 seconds and automatically retry any pending failed requests
4. WHILE the device is offline and the user attempts an action requiring network, THE App SHALL display a Toast message explaining the action requires internet connectivity
5. WHILE the device is offline, THE App SHALL display cached data where available (user profile, last loaded packages, last loaded reservations)

### Requirement 7: Request Timeout Handling

**User Story:** As a member, I want to be informed when a request is taking too long, so that I can decide whether to wait or retry.

#### Acceptance Criteria

1. WHEN an API request does not receive a response within 15 seconds, THE API_Client SHALL abort the request and throw a timeout error
2. WHEN a timeout error occurs, THE App SHALL display an Error_Banner with a message indicating the request timed out and a Retry_Button
3. THE timeout error message SHALL be distinct from network-offline errors so the user understands the server is slow rather than unreachable
4. WHEN the user taps the Retry_Button after a timeout, THE API_Client SHALL re-attempt the request with the same 15-second timeout

### Requirement 8: Toast Notification System

**User Story:** As a member, I want brief success and info messages to appear as non-intrusive toasts, so that I receive feedback without blocking my workflow.

#### Acceptance Criteria

1. WHEN a booking is successfully created, THE App SHALL display a success Toast with a confirmation message instead of an Alert dialog
2. WHEN a cafe order is successfully submitted, THE App SHALL display a success Toast with a confirmation message
3. WHEN an event join or leave action succeeds, THE App SHALL display a success Toast with a confirmation message
4. THE Toast SHALL auto-dismiss after 3 seconds
5. THE Toast SHALL be tappable to dismiss immediately
6. THE Toast SHALL support three visual variants: success (green accent), error (red/danger accent), and info (blue accent)
7. THE Toast SHALL appear at the top of the screen below the safe area inset, and SHALL not overlap with the Offline_Indicator

### Requirement 9: Pull-to-Refresh Support

**User Story:** As a member, I want to pull down on list screens to refresh data, so that I can manually trigger a data update when I suspect content is stale.

#### Acceptance Criteria

1. WHEN the user performs a pull-to-refresh gesture on the MemberHomeScreen, THE App SHALL re-fetch all visible data sections (packages, reservations, trainers, events, massage slots, cafe orders)
2. WHEN the user performs a pull-to-refresh gesture on the MemberEventsScreen, THE App SHALL re-fetch the events list
3. WHEN the user performs a pull-to-refresh gesture on the MemberReservationsScreen, THE App SHALL re-fetch the reservations list
4. WHILE a pull-to-refresh is in progress, THE App SHALL display the platform-native refresh indicator
5. WHEN the pull-to-refresh completes, THE App SHALL dismiss the refresh indicator regardless of success or failure
6. IF the pull-to-refresh fails due to a network error, THEN THE App SHALL display an Error_Banner or Toast indicating the refresh failed
