# KEEP — API Routes (56 files)

> Expo app depends on these. Do NOT touch.

## Booking API (9 files)

| File | Endpoint | Key Imports |
|------|----------|-------------|
| `src/app/api/bookings/route.ts` | POST /api/bookings | getApiUser, createAdminClient, createBookingSchema, calculateTotalAmount, calculateProtectionEnd |
| `src/app/api/bookings/[id]/route.ts` | GET /api/bookings/:id | getApiUser, createAdminClient, BookingDetail types |
| `src/app/api/bookings/[id]/approve/route.ts` | POST /api/bookings/:id/approve | getApiUser, createAdminClient |
| `src/app/api/bookings/[id]/checkin/route.ts` | POST /api/bookings/:id/checkin | getApiUser, createAdminClient, calculateProtectionEnd |
| `src/app/api/bookings/[id]/check-out/route.ts` | PUT /api/bookings/:id/check-out | getApiUser, createAdminClient, updateCheckOutSchema |
| `src/app/api/bookings/[id]/pay/route.ts` | POST /api/bookings/:id/pay | getApiUser, createAdminClient, initiateBookingPayment |
| `src/app/api/bookings/[id]/extend/route.ts` | POST /api/bookings/:id/extend | getApiUser, createAdminClient, extendBookingSchema |
| `src/app/api/bookings/[id]/cancel-switch/route.ts` | POST /api/bookings/:id/cancel-switch | getApiUser, createAdminClient |
| `src/app/api/bookings/switch/route.ts` | POST /api/bookings/switch | getApiUser, createAdminClient, switchVillaSchema |

> Note: `POST /api/bookings/switch/suggest` does NOT exist.

## Villa API (4 files)

| File | Endpoint | Key Imports |
|------|----------|-------------|
| `src/app/api/villas/search/route.ts` | GET /api/villas/search | createAdminClient, searchParamsSchema, SearchResponse types |
| `src/app/api/villas/viewport/route.ts` | GET /api/villas/viewport | createAdminClient |
| `src/app/api/villas/[id]/booking-info/route.ts` | GET /api/villas/:id/booking-info | createAdminClient, BookingInfo types |
| `src/app/api/villas/[id]/bump/route.ts` | POST /api/villas/:id/bump | getApiUser, createAdminClient, canBump, formatDeadline |

## Bump API (1 file)

| File | Endpoint | Key Imports |
|------|----------|-------------|
| `src/app/api/bumps/[id]/respond/route.ts` | POST /api/bumps/:id/respond | getApiUser, createAdminClient |

## Saved Villas API (2 files)

| File | Endpoint | Key Imports |
|------|----------|-------------|
| `src/app/api/saved-villas/route.ts` | GET /api/saved-villas | getApiUser, createAdminClient, SavedVillasResponse |
| `src/app/api/saved-villas/[villaId]/route.ts` | POST/DELETE /api/saved-villas/:villaId | getApiUser, createAdminClient, saveVillaSchema |

## Profile API (3 files)

| File | Endpoint | Key Imports |
|------|----------|-------------|
| `src/app/api/profile/route.ts` | GET/PUT /api/profile | getApiUser, createAdminClient, updateProfileSchema, ProfileResponse |
| `src/app/api/profile/avatar/route.ts` | POST /api/profile/avatar | getApiUser, createAdminClient |
| `src/app/api/profile/payment-methods/route.ts` | GET/POST /api/profile/payment-methods | getApiUser, createAdminClient |

## Messages/Conversations API (4 files)

| File | Endpoint | Key Imports |
|------|----------|-------------|
| `src/app/api/messages/route.ts` | POST /api/messages | getApiUser, sendMessage |
| `src/app/api/conversations/route.ts` | GET /api/conversations | getApiUser, getConversationsByUser |
| `src/app/api/conversations/[id]/messages/route.ts` | GET /api/conversations/:id/messages | getApiUser, getMessages, isParticipant |
| `src/app/api/conversations/[id]/read/route.ts` | POST /api/conversations/:id/read | getApiUser, markAsRead, isParticipant |

## Admin API Routes (17 files)

| File | Endpoint |
|------|----------|
| `src/app/api/admin/bookings/[id]/cancel/route.ts` | POST — admin cancel booking |
| `src/app/api/admin/bookings/[id]/complete/route.ts` | POST — admin complete booking |
| `src/app/api/admin/bumps/[id]/flag/route.ts` | POST — flag suspicious bump |
| `src/app/api/admin/bumps/[id]/notes/route.ts` | POST — add bump notes |
| `src/app/api/admin/bumps/[id]/resolve/route.ts` | POST — resolve dispute |
| `src/app/api/admin/owners/route.ts` | GET — list owners |
| `src/app/api/admin/payments/[id]/retry/route.ts` | POST — retry payment |
| `src/app/api/admin/users/[id]/delete/route.ts` | DELETE — delete user |
| `src/app/api/admin/users/[id]/make-owner/route.ts` | POST — promote to owner |
| `src/app/api/admin/users/[id]/remove-owner/route.ts` | POST — remove owner |
| `src/app/api/admin/users/[id]/toggle-admin/route.ts` | POST — toggle admin |
| `src/app/api/admin/users/[id]/verify-owner/route.ts` | POST — verify owner |
| `src/app/api/admin/villas/route.ts` | GET/POST — list/create villas |
| `src/app/api/admin/villas/[id]/route.ts` | GET/PUT — get/update villa |
| `src/app/api/admin/villas/[id]/sync/route.ts` | POST — sync external calendars |
| `src/app/api/admin/villas/[id]/photos/route.ts` | POST — upload photos |
| `src/app/api/admin/villas/[id]/photos/[photoId]/route.ts` | DELETE — delete photo |

## Cron Jobs (8 files)

| File | Purpose | Key Imports |
|------|---------|-------------|
| `src/app/api/cron/auto-bump/route.ts` | Auto-trigger bumps | verifyCronSecret, createAdminClient |
| `src/app/api/cron/auto-checkin/route.ts` | Auto-check-in renters | verifyCronSecret, createAdminClient, calculateProtectionEnd |
| `src/app/api/cron/enforce-bump-deadlines/route.ts` | Enforce response deadlines | verifyCronSecret, createAdminClient |
| `src/app/api/cron/expire-bookings/route.ts` | Expire unanswered requests | verifyCronSecret, createAdminClient |
| `src/app/api/cron/ical-sync/route.ts` | Sync external calendars | verifyCronSecret, createAdminClient, parseIcal |
| `src/app/api/cron/ical-stale-check/route.ts` | Verify iCal feeds | verifyCronSecret, createAdminClient |
| `src/app/api/cron/process-checkouts/route.ts` | Process checkout automations | verifyCronSecret, createAdminClient, calculateCheckoutFinancials |
| `src/app/api/cron/refresh-rates/route.ts` | Update exchange rates | verifyCronSecret, createAdminClient |

## Webhooks (4 files)

| File | Purpose | Key Imports |
|------|---------|-------------|
| `src/app/api/webhooks/xendit/payment/route.ts` | Xendit payment callback | verifyXenditWebhook, createAdminClient |
| `src/app/api/webhooks/xendit/disbursement/route.ts` | Xendit payout webhook | verifyXenditWebhook, createAdminClient |
| `src/app/api/webhooks/xendit/refund/route.ts` | Refund status webhook | verifyXenditWebhook, createAdminClient |
| `src/app/api/webhooks/twilio/status/route.ts` | Twilio message delivery | createAdminClient, twilio.validateRequest |

## Other API (4 files)

| File | Purpose |
|------|---------|
| `src/app/api/ical/[villaId]/route.ts` | Generate iCal feed for external sync |
| `src/app/api/seed/villas/route.ts` | DB seeding endpoint |
| `src/app/api/setup/route.ts` | Initial setup/onboarding |
| `src/app/api/debug/route.ts` | Debug endpoint |

## Auth API Routes (2 files)

| File | Purpose |
|------|---------|
| `src/app/auth/callback/route.ts` | OAuth callback handler |
| `src/app/auth/redirect/route.ts` | Auth redirect handler |
