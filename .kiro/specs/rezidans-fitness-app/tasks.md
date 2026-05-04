# Implementation Tasks - Rezidans Fitness App

## Phase 1: Project Setup & Infrastructure

### 1. Initialize Project Structure

- [x] 1.1 Create monorepo structure (backend, mobile, web-admin)
- [x] 1.2 Setup NestJS backend project with TypeScript
- [x] 1.3 Setup React Native mobile project
- [x] 1.4 Setup React web admin project
- [x] 1.5 Configure ESLint, Prettier, and Git hooks
- [x] 1.6 Setup package.json scripts for all projects
- [x] 1.7 Create .env.example files for environment variables

### 2. Setup Development Environment

- [x] 2.1 Configure Docker Compose for local development (PostgreSQL, Redis)
- [x] 2.2 Setup database connection pooling (PgBouncer)
- [x] 2.3 Configure Redis for caching and sessions
- [x] 2.4 Setup local S3 (MinIO) for file storage testing
- [x] 2.5 Create development seed data scripts

### 3. Setup CI/CD Pipeline

- [x] 3.1 Create GitHub Actions workflow for backend tests
- [x] 3.2 Create GitHub Actions workflow for mobile tests
- [x] 3.3 Create GitHub Actions workflow for web admin tests
- [ ] 3.4 Setup Docker image build and push to registry
- [ ] 3.5 Configure automated deployment to staging environment
- [ ] 3.6 Setup code coverage reporting (Codecov)

## Phase 2: Database Schema & Migrations

### 4. Create Database Schema

- [x] 4.1 Create tenant table with branding and settings
- [x] 4.2 Create user table with multi-tenant support
- [x] 4.3 Create trainer table with profiles and specializations
- [x] 4.4 Create package_type and package tables
- [x] 4.5 Create reservation table with versioning for optimistic locking
- [x] 4.6 Create availability and time_slot tables
- [x] 4.7 Create waiting_list table
- [x] 4.8 Create payment_transaction table
- [x] 4.9 Create discount_code table
- [x] 4.10 Create health_data table
- [x] 4.11 Create notification table
- [x] 4.12 Create rating table
- [x] 4.13 Create facility_access_log table
- [x] 4.14 Create api_key table

### 5. Setup Database Indexes and Constraints

- [x] 5.1 Create composite indexes for multi-tenant queries
- [x] 5.2 Create partial indexes for active records
- [x] 5.3 Setup foreign key constraints
- [x] 5.4 Setup unique constraints
- [x] 5.5 Create check constraints for data validation

### 6. Implement Database Partitioning

- [ ] 6.1 Setup monthly partitioning for reservation table
- [ ] 6.2 Create partition maintenance scripts
- [ ] 6.3 Setup automated partition creation for future months

### 7. Setup Row-Level Security (RLS)

- [ ] 7.1 Enable RLS on all tenant-scoped tables
- [ ] 7.2 Create RLS policies for tenant data isolation
- [ ] 7.3 Test RLS policies with different tenant contexts

## Phase 3: Backend - Authentication Service

### 8. Implement Authentication Service

- [x] 8.1 Create User entity and repository
- [x] 8.2 Implement user registration endpoint
- [x] 8.3 Implement login endpoint with JWT generation
- [x] 8.4 Implement logout endpoint
- [x] 8.5 Implement refresh token endpoint
- [ ] 8.6 Implement password reset flow (forgot password, reset password)
- [x] 8.7 Implement account lockout after failed attempts
- [ ] 8.8 Implement OAuth 2.0 integration (Google, Apple)

### 9. Implement Authorization Middleware

- [x] 9.1 Create JWT validation middleware
- [x] 9.2 Create role-based access control (RBAC) guards
- [x] 9.3 Create tenant context middleware
- [ ] 9.4 Implement session management with Redis

### 10. Write Authentication Tests

- [ ] 10.1 Write unit tests for authentication service
- [ ] 10.2 Write integration tests for auth endpoints
- [ ] 10.3 Write property-based tests for authentication properties

## Phase 4: Backend - Booking Service

### 11. Implement Booking Service

- [x] 11.1 Create Reservation entity and repository
- [x] 11.2 Implement create reservation endpoint with optimistic locking
- [x] 11.3 Implement cancel reservation endpoint with refund logic
- [x] 11.4 Implement get availability endpoint
- [x] 11.5 Implement reservation history endpoint
- [x] 11.6 Implement waiting list join endpoint
- [x] 11.7 Implement waiting list notification logic
- [ ] 11.8 Implement automatic reservation completion (cron job)

### 12. Implement Concurrency Control

- [ ] 12.1 Implement distributed locking with Redis for booking operations
- [ ] 12.2 Implement optimistic locking with version field
- [ ] 12.3 Implement race condition prevention tests

### 13. Write Booking Tests

- [ ] 13.1 Write unit tests for booking service
- [x] 13.2 Write integration tests for booking endpoints
- [ ] 13.3 Write property-based tests for booking properties (uniqueness, balance, refund)

## Phase 5: Backend - Payment Service

### 14. Implement Payment Service

- [ ] 14.1 Create PaymentTransaction entity and repository
- [ ] 14.2 Integrate Stripe SDK
- [ ] 14.3 Implement purchase package endpoint
- [ ] 14.4 Implement refund endpoint
- [ ] 14.5 Implement payment method management endpoints
- [ ] 14.6 Implement Stripe webhook handler
- [ ] 14.7 Implement idempotency key handling
- [ ] 14.8 Implement discount code validation and application

### 15. Write Payment Tests

- [ ] 15.1 Write unit tests for payment service
- [ ] 15.2 Write integration tests with Stripe test mode
- [ ] 15.3 Write property-based tests for payment properties (idempotency, tokenization)

## Phase 6: Backend - Notification Service

### 16. Implement Notification Service

- [ ] 16.1 Create Notification entity and repository
- [ ] 16.2 Integrate Firebase Cloud Messaging (FCM)
- [ ] 16.3 Implement push notification sending
- [ ] 16.4 Implement email notification sending (SendGrid/AWS SES)
- [ ] 16.5 Implement in-app notification center
- [ ] 16.6 Implement notification preferences management
- [ ] 16.7 Implement scheduled reminders (24h, 1h before session)
- [ ] 16.8 Implement notification retry logic with exponential backoff

### 17. Write Notification Tests

- [ ] 17.1 Write unit tests for notification service
- [ ] 17.2 Write integration tests for notification endpoints
- [ ] 17.3 Write property-based tests for notification properties (delivery guarantee)

## Phase 7: Backend - Calendar Service

### 18. Implement Calendar Service

- [ ] 18.1 Create Availability and TimeSlot entities
- [ ] 18.2 Implement set availability endpoint
- [ ] 18.3 Implement recurring pattern endpoint
- [ ] 18.4 Implement get trainer schedule endpoint
- [ ] 18.5 Implement conflict detection logic
- [ ] 18.6 Implement calendar synchronization with external calendars (optional)

### 19. Write Calendar Tests

- [ ] 19.1 Write unit tests for calendar service
- [ ] 19.2 Write integration tests for calendar endpoints
- [ ] 19.3 Write property-based tests for calendar properties (synchronization, availability)

## Phase 8: Backend - Health Service

### 20. Implement Health Service

- [ ] 20.1 Create HealthData entity and repository
- [ ] 20.2 Implement sync health data endpoint
- [ ] 20.3 Implement get health data endpoint
- [ ] 20.4 Implement get trends endpoint
- [ ] 20.5 Implement consent management endpoints
- [ ] 20.6 Implement data privacy controls

### 21. Write Health Tests

- [ ] 21.1 Write unit tests for health service
- [ ] 21.2 Write integration tests for health endpoints
- [ ] 21.3 Write property-based tests for health properties (sync idempotency, user association)

## Phase 9: Backend - Admin & Reporting

### 22. Implement Admin Service

- [ ] 22.1 Implement user management endpoints (CRUD)
- [ ] 22.2 Implement trainer management endpoints (CRUD)
- [ ] 22.3 Implement package type management endpoints (CRUD)
- [ ] 22.4 Implement discount code management endpoints (CRUD)
- [ ] 22.5 Implement tenant configuration endpoints

### 23. Implement Reporting Service

- [ ] 23.1 Implement occupancy rate calculation
- [ ] 23.2 Implement revenue reports
- [ ] 23.3 Implement usage statistics
- [ ] 23.4 Implement export to CSV/PDF
- [ ] 23.5 Implement dashboard metrics endpoint

### 24. Write Admin & Reporting Tests

- [ ] 24.1 Write unit tests for admin service
- [ ] 24.2 Write integration tests for admin endpoints
- [ ] 24.3 Write property-based tests for reporting properties (calculation accuracy)

## Phase 10: Backend - QR Code & Access Control

### 25. Implement QR Code Service

- [ ] 25.1 Implement QR code generation endpoint
- [ ] 25.2 Implement QR code validation endpoint
- [ ] 25.3 Implement facility access logging
- [ ] 25.4 Implement access log retrieval endpoint

### 26. Write QR Code Tests

- [ ] 26.1 Write unit tests for QR code service
- [ ] 26.2 Write integration tests for QR endpoints
- [ ] 26.3 Write property-based tests for QR properties (round-trip, temporal validity)

## Phase 11: Backend - API Gateway & Rate Limiting

### 27. Implement API Gateway

- [ ] 27.1 Setup API Gateway (Kong or AWS API Gateway)
- [ ] 27.2 Configure rate limiting rules
- [ ] 27.3 Configure request/response transformation
- [ ] 27.4 Configure API versioning
- [ ] 27.5 Setup API documentation (Swagger/OpenAPI)

### 28. Implement Rate Limiting

- [ ] 28.1 Implement Redis-based rate limiting
- [ ] 28.2 Implement API key management
- [ ] 28.3 Write rate limiting tests

## Phase 12: Mobile App - Core Setup

### 29. Setup Mobile App Foundation

- [ ] 29.1 Configure React Native navigation (React Navigation)
- [ ] 29.2 Setup Redux Toolkit for state management
- [ ] 29.3 Setup RTK Query for API calls
- [ ] 29.4 Configure React Native Paper UI components
- [x] 29.5 Setup i18n for localization (Turkish, English)
- [x] 29.6 Configure environment variables

### 30. Implement Authentication Screens

- [x] 30.1 Create login screen
- [ ] 30.2 Create registration screen
- [ ] 30.3 Create forgot password screen
- [ ] 30.4 Implement secure token storage (Keychain/Keystore)
- [ ] 30.5 Implement auto-login on app launch

## Phase 13: Mobile App - Member Features

### 31. Implement Home & Dashboard

- [ ] 31.1 Create home screen with package balance
- [ ] 31.2 Create upcoming reservations list
- [ ] 31.3 Implement pull-to-refresh
- [ ] 31.4 Implement navigation to booking screen

### 32. Implement Booking Flow

- [ ] 32.1 Create trainer selection screen
- [ ] 32.2 Create time slot selection screen with calendar
- [ ] 32.3 Create booking confirmation screen
- [ ] 32.4 Implement real-time availability updates
- [ ] 32.5 Implement waiting list join flow

### 33. Implement Reservation Management

- [ ] 33.1 Create reservation history screen
- [ ] 33.2 Create reservation detail screen
- [ ] 33.3 Implement cancel reservation flow
- [ ] 33.4 Implement session rating flow

### 34. Implement Package Management

- [ ] 34.1 Create package selection screen
- [ ] 34.2 Implement Stripe payment integration
- [ ] 34.3 Create payment confirmation screen
- [ ] 34.4 Implement discount code input

### 35. Implement QR Code Feature

- [ ] 35.1 Create QR code display screen
- [ ] 35.2 Implement QR code generation with 60s refresh
- [ ] 35.3 Implement offline QR code caching

## Phase 14: Mobile App - Health Integration

### 36. Implement Health Data Integration

- [ ] 36.1 Integrate Apple HealthKit (iOS)
- [ ] 36.2 Integrate Google Fit API (Android)
- [ ] 36.3 Create health data permission flow
- [ ] 36.4 Create health data dashboard screen
- [ ] 36.5 Implement 30-day trend charts
- [ ] 36.6 Implement background sync (every 6 hours)

## Phase 15: Mobile App - Notifications

### 37. Implement Push Notifications

- [ ] 37.1 Integrate Firebase Cloud Messaging
- [ ] 37.2 Implement notification permission request
- [ ] 37.3 Implement notification handling (foreground, background)
- [ ] 37.4 Create in-app notification center
- [ ] 37.5 Implement notification preferences screen

## Phase 16: Mobile App - Offline Support

### 38. Implement Offline Capability

- [ ] 38.1 Setup Redux Persist for offline data
- [ ] 38.2 Implement offline indicator
- [ ] 38.3 Cache reservation data for offline viewing
- [ ] 38.4 Cache QR code for offline access
- [ ] 38.5 Implement sync on reconnection

## Phase 17: Mobile App - Trainer Features

### 39. Implement Trainer Screens

- [ ] 39.1 Create trainer dashboard with daily schedule
- [ ] 39.2 Create availability management screen
- [ ] 39.3 Create recurring pattern setup screen
- [ ] 39.4 Implement reservation approval/rejection flow
- [ ] 39.5 Create session participant list screen

## Phase 18: Web Admin Panel - Core Setup

### 40. Setup Web Admin Foundation

- [x] 40.1 Setup React with TypeScript
- [x] 40.2 Setup React Router for navigation
- [ ] 40.3 Setup Redux Toolkit and RTK Query
- [ ] 40.4 Setup Material-UI components
- [x] 40.5 Setup i18n for localization
- [ ] 40.6 Create responsive layout with sidebar

### 41. Implement Admin Authentication

- [x] 41.1 Create admin login page
- [x] 41.2 Implement protected routes
- [x] 41.3 Implement session management

## Phase 19: Web Admin Panel - Dashboard

### 42. Implement Admin Dashboard

- [ ] 42.1 Create dashboard with key metrics cards
- [ ] 42.2 Implement real-time metrics updates (60s interval)
- [ ] 42.3 Create occupancy rate chart
- [ ] 42.4 Create revenue chart
- [ ] 42.5 Create recent activity feed

## Phase 20: Web Admin Panel - User Management

### 43. Implement User Management

- [ ] 43.1 Create user list page with search and filters
- [ ] 43.2 Create user detail page
- [ ] 43.3 Create user create/edit form
- [ ] 43.4 Implement user deactivation
- [ ] 43.5 Implement bulk operations

### 44. Implement Trainer Management

- [ ] 44.1 Create trainer list page
- [ ] 44.2 Create trainer detail page with profile
- [ ] 44.3 Create trainer create/edit form
- [ ] 44.4 Implement trainer specialization management
- [ ] 44.5 Display trainer ratings and statistics

## Phase 21: Web Admin Panel - Package & Pricing

### 45. Implement Package Management

- [ ] 45.1 Create package type list page
- [ ] 45.2 Create package type create/edit form
- [ ] 45.3 Implement package activation/deactivation
- [ ] 45.4 Display package sales statistics

### 46. Implement Discount Code Management

- [ ] 46.1 Create discount code list page
- [ ] 46.2 Create discount code create/edit form
- [ ] 46.3 Display campaign performance metrics
- [ ] 46.4 Implement discount code expiration management

## Phase 22: Web Admin Panel - Reporting

### 47. Implement Reporting Module

- [ ] 47.1 Create revenue report page with date filters
- [ ] 47.2 Create occupancy report page
- [ ] 47.3 Create member behavior analysis page
- [ ] 47.4 Implement CSV export
- [ ] 47.5 Implement PDF export
- [ ] 47.6 Create scheduled report email feature

## Phase 23: Web Admin Panel - Configuration

### 48. Implement Tenant Configuration

- [ ] 48.1 Create tenant settings page
- [ ] 48.2 Implement branding customization (logo, colors)
- [ ] 48.3 Implement facility settings (hours, capacity)
- [ ] 48.4 Implement notification settings
- [ ] 48.5 Implement payment settings

### 49. Implement Access Control

- [ ] 49.1 Create facility access log page
- [ ] 49.2 Implement access log filtering and search
- [ ] 49.3 Display access statistics

## Phase 24: Testing - Property-Based Tests

### 50. Implement Property-Based Tests (Part 1)

- [ ] 50.1 Property 1: Tenant Data Isolation
- [ ] 50.2 Property 2: Authentication Session Binding
- [ ] 50.3 Property 3: Role-Based Access Control
- [ ] 50.4 Property 4: Package Balance Invariant
- [ ] 50.5 Property 5: Reservation Time Slot Uniqueness
- [ ] 50.6 Property 6: Timezone Conversion Correctness
- [ ] 50.7 Property 7: Cancellation Refund Policy
- [ ] 50.8 Property 8: Package Expiration Enforcement
- [ ] 50.9 Property 9: Trainer Availability Enforcement
- [ ] 50.10 Property 10: Calendar Synchronization Consistency

### 51. Implement Property-Based Tests (Part 2)

- [ ] 51.1 Property 11: Concurrent Booking Race Condition Prevention
- [ ] 51.2 Property 12: Occupancy Rate Calculation
- [ ] 51.3 Property 13: Revenue Calculation Accuracy
- [ ] 51.4 Property 14: Report Export Data Integrity
- [ ] 51.5 Property 15: QR Code Round-Trip Encoding
- [ ] 51.6 Property 16: QR Code Temporal Validity
- [ ] 51.7 Property 17: Facility Access Logging Completeness
- [ ] 51.8 Property 18: Payment Tokenization Security
- [ ] 51.9 Property 19: Health Data User Association
- [ ] 51.10 Property 20: Health Data Trend Calculation

### 52. Implement Property-Based Tests (Part 3)

- [ ] 52.1 Property 21: Reservation Status Filtering
- [ ] 52.2 Property 22: Automatic Reservation Completion
- [ ] 52.3 Property 23: API Rate Limiting Enforcement
- [ ] 52.4 Property 24: Webhook Event Delivery
- [ ] 52.5 Property 25: API Response Format Validity
- [ ] 52.6 Property 26: Localization Date/Time Formatting
- [ ] 52.7 Property 27: Rating Value Validation
- [ ] 52.8 Property 28: Rating Feedback Length Validation
- [ ] 52.9 Property 29: Trainer Average Rating Calculation
- [ ] 52.10 Property 30: Rating Edit Time Window

### 53. Implement Property-Based Tests (Part 4)

- [ ] 53.1 Property 31: Waiting List Chronological Ordering
- [ ] 53.2 Property 32: Waiting List Timeout Removal
- [ ] 53.3 Property 33: Waiting List Automatic Cleanup
- [ ] 53.4 Property 34: Discount Code Validation
- [ ] 53.5 Property 35: Discount Calculation Accuracy
- [ ] 53.6 Property 36: Discount Code Single Application
- [ ] 53.7 Property 37: Campaign Performance Metrics
- [ ] 53.8 Property 38: GDPR Data Export Completeness
- [ ] 53.9 Property 39: GDPR Data Deletion Completeness
- [ ] 53.10 Property 40: Audit Logging Completeness

## Phase 25: Testing - Integration & E2E

### 54. Implement Integration Tests

- [ ] 54.1 Write integration tests for all API endpoints
- [ ] 54.2 Write database integration tests
- [ ] 54.3 Write Redis integration tests
- [ ] 54.4 Write Stripe integration tests (test mode)
- [ ] 54.5 Write FCM integration tests (test mode)

### 55. Implement E2E Tests

- [ ] 55.1 Setup Playwright for web admin E2E tests
- [ ] 55.2 Setup Detox for mobile E2E tests
- [ ] 55.3 Write E2E test for complete booking flow
- [ ] 55.4 Write E2E test for payment flow
- [ ] 55.5 Write E2E test for admin user management
- [ ] 55.6 Write E2E test for offline functionality

### 56. Implement Performance Tests

- [ ] 56.1 Setup k6 for load testing
- [ ] 56.2 Write performance tests for booking endpoints
- [ ] 56.3 Write performance tests for availability queries
- [ ] 56.4 Write performance tests for concurrent users
- [ ] 56.5 Verify 95th percentile response time <500ms

## Phase 26: Infrastructure - AWS Deployment

### 57. Setup AWS Infrastructure

- [ ] 57.1 Create VPC with public and private subnets
- [ ] 57.2 Setup RDS PostgreSQL with Multi-AZ
- [ ] 57.3 Setup ElastiCache Redis cluster
- [ ] 57.4 Setup S3 bucket for file storage
- [ ] 57.5 Setup CloudFront CDN
- [ ] 57.6 Setup Application Load Balancer
- [ ] 57.7 Setup ECS cluster with Fargate

### 58. Setup Deployment Pipeline

- [ ] 58.1 Create Dockerfile for backend services
- [ ] 58.2 Create ECS task definitions
- [ ] 58.3 Setup blue-green deployment strategy
- [ ] 58.4 Configure auto-scaling policies
- [ ] 58.5 Setup health checks and monitoring

### 59. Setup Security

- [ ] 59.1 Configure security groups and NACLs
- [ ] 59.2 Setup AWS Secrets Manager for credentials
- [ ] 59.3 Enable encryption at rest for RDS and S3
- [ ] 59.4 Configure TLS certificates (ACM)
- [ ] 59.5 Setup VPC Flow Logs

## Phase 27: Monitoring & Observability

### 60. Setup Monitoring

- [ ] 60.1 Setup CloudWatch Logs for all services
- [ ] 60.2 Setup CloudWatch Metrics and dashboards
- [ ] 60.3 Setup Sentry for error tracking
- [ ] 60.4 Setup AWS X-Ray for distributed tracing
- [ ] 60.5 Setup UptimeRobot for uptime monitoring

### 61. Setup Alerting

- [ ] 61.1 Create CloudWatch alarms for critical metrics
- [ ] 61.2 Setup PagerDuty integration for on-call
- [ ] 61.3 Setup Slack notifications for warnings
- [ ] 61.4 Create runbooks for common incidents

## Phase 28: Documentation

### 62. Create Technical Documentation

- [ ] 62.1 Write API documentation (OpenAPI/Swagger)
- [ ] 62.2 Write database schema documentation
- [ ] 62.3 Write deployment guide
- [ ] 62.4 Write development setup guide
- [ ] 62.5 Write troubleshooting guide

### 63. Create User Documentation

- [ ] 63.1 Write member user guide
- [ ] 63.2 Write trainer user guide
- [ ] 63.3 Write admin user guide
- [ ] 63.4 Create video tutorials
- [ ] 63.5 Create FAQ document

## Phase 29: Security & Compliance

### 64. Security Audit

- [ ] 64.1 Run OWASP ZAP vulnerability scan
- [ ] 64.2 Perform penetration testing
- [ ] 64.3 Review and fix security findings
- [ ] 64.4 Run dependency vulnerability scan (npm audit, Snyk)
- [ ] 64.5 Implement security headers (Helmet.js)

### 65. GDPR Compliance

- [ ] 65.1 Implement data export functionality
- [ ] 65.2 Implement data deletion functionality
- [ ] 65.3 Implement consent management
- [ ] 65.4 Create privacy policy
- [ ] 65.5 Create terms of service

## Phase 30: Launch Preparation

### 66. Beta Testing

- [ ] 66.1 Deploy to staging environment
- [ ] 66.2 Conduct internal testing
- [ ] 66.3 Invite beta testers (first rezidans)
- [ ] 66.4 Collect and address feedback
- [ ] 66.5 Fix critical bugs

### 67. Production Launch

- [ ] 67.1 Deploy to production environment
- [ ] 67.2 Configure production monitoring and alerting
- [ ] 67.3 Setup automated backups
- [ ] 67.4 Create disaster recovery plan
- [ ] 67.5 Conduct smoke tests on production

### 68. Post-Launch

- [ ] 68.1 Monitor system performance and errors
- [ ] 68.2 Collect user feedback
- [ ] 68.3 Plan iteration and improvements
- [ ] 68.4 Create marketing materials
- [ ] 68.5 Prepare sales pitch for other facilities

## Notes

- **MVP odak:** Tam kapsam yerine önce MVP tanımına uy; ayrıntı için `mvp.md` (aynı klasör).
- All tasks should be completed in order within each phase
- Some phases can be worked on in parallel (e.g., mobile and web admin)
- Property-based tests should be written alongside feature implementation
- Code reviews required for all pull requests
- All tests must pass before merging to main branch
- Estimated total project duration: 6-9 months with a team of 3-4 developers
