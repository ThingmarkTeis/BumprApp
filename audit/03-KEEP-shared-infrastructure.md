# KEEP — Shared Infrastructure (~65 files)

> Used by API routes and/or admin dashboard. Do NOT delete.

## Supabase Core (5 files)

| File | Used By |
|------|---------|
| `src/lib/supabase/admin.ts` | Nearly every API route + all admin pages |
| `src/lib/supabase/server.ts` | API routes, auth, services |
| `src/lib/supabase/client.ts` | Realtime subscriptions, login/signup pages |
| `src/lib/supabase/middleware.ts` | Root middleware (src/middleware.ts) |
| `src/lib/supabase/types.ts` | Everything — Database, BookingStatus, BumpStatus, VillaStatus, etc. |

## Supabase Migrations (9 files)

| File | Purpose |
|------|---------|
| `src/lib/supabase/migrations/002_functions.sql` | DB functions |
| `src/lib/supabase/migrations/003_villa_search.sql` | Search functions |
| `src/lib/supabase/migrations/004_profile_fields.sql` | Profile structure |
| `src/lib/supabase/migrations/005_booking_guests_arrival.sql` | Booking fields |
| `src/lib/supabase/migrations/006_booking_flow.sql` | State machine |
| `src/lib/supabase/migrations/007_conversations_rls.sql` | RLS policies |
| `src/lib/supabase/setup-storage.sql` | Storage bucket config |
| `supabase/migrations/008_switch_villa.sql` | Rebook after bump |
| `supabase/migrations/009_saved_villas.sql` | Saved villas table |

## Auth (4 files)

| File | Used By |
|------|---------|
| `src/lib/auth/get-api-user.ts` | All authenticated API routes |
| `src/lib/auth/get-user-role.ts` | Admin layout, app layout, auth callback |
| `src/lib/auth/verify-admin.ts` | All admin API routes |
| `src/lib/auth/verify-cron.ts` | All cron routes |

## Services (10 files)

| File | Used By |
|------|---------|
| `src/lib/services/bookings.ts` | Booking API routes |
| `src/lib/services/bumps.ts` | Bump API routes, cron jobs |
| `src/lib/services/payments.ts` | Payment API, xendit flows, cron |
| `src/lib/services/messages.ts` | Messages/conversations API |
| `src/lib/services/notifications.ts` | API routes (booking/bump event hooks) |
| `src/lib/services/protection.ts` | Booking/bump API, cron jobs |
| `src/lib/services/transitions.ts` | bookings.ts, bumps.ts services |
| `src/lib/services/villas.ts` | Villa API routes, admin villa management |
| `src/lib/services/external-availability.ts` | iCal sync cron, admin villa sync |
| `src/lib/services/exchange-rates.ts` | Refresh rates cron |

## Xendit Integration (6 files)

| File | Used By |
|------|---------|
| `src/lib/integrations/xendit/client.ts` | charge, disbursement, refund |
| `src/lib/integrations/xendit/charge.ts` | flows.ts |
| `src/lib/integrations/xendit/disbursement.ts` | flows.ts |
| `src/lib/integrations/xendit/refund.ts` | flows.ts |
| `src/lib/integrations/xendit/verify-webhook.ts` | Xendit webhook routes |
| `src/lib/integrations/xendit/flows.ts` | Booking pay API, cron, admin |

## WhatsApp Integration (3 files)

| File | Used By |
|------|---------|
| `src/lib/integrations/whatsapp/client.ts` | send.ts |
| `src/lib/integrations/whatsapp/send.ts` | templates.ts |
| `src/lib/integrations/whatsapp/templates.ts` | Notification service |

## Validations (4 files)

| File | Used By |
|------|---------|
| `src/lib/validations/booking.ts` | Booking API routes |
| `src/lib/validations/search.ts` | Villa search API route |
| `src/lib/validations/saved-villas.ts` | Saved villas API routes |
| `src/lib/validations/profile.ts` | Profile API routes |

## Utilities (3 files)

| File | Used By |
|------|---------|
| `src/lib/utils/dates.ts` | API routes, services, admin bumps page, BumpFlow |
| `src/lib/utils/currency.ts` | API routes, admin pages, VillaForm |
| `src/lib/utils/ical-parser.ts` | iCal cron routes, admin villa sync |

## Other Lib Files (2 files)

| File | Used By |
|------|---------|
| `src/lib/amenities.tsx` | Admin VillaForm (AMENITIES, AMENITY_KEYS) + renter AmenityList (DELETE consumer) |
| `src/lib/booking-utils.ts` | Booking API routes (calculateTotalAmount, calculateProtectionStatus) |

## Types (4 files)

| File | Used By |
|------|---------|
| `src/types/booking.ts` | Booking API routes |
| `src/types/search.ts` | Villa search API route |
| `src/types/saved-villas.ts` | Saved villas API routes |
| `src/types/profile.ts` | Profile API routes |

## Middleware (1 file)

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Supabase session refresh — imports `@/lib/supabase/middleware` |

## Root Config Files (12 files)

| File | Purpose |
|------|---------|
| `package.json` | Dependencies & scripts |
| `package-lock.json` | Lock file |
| `tsconfig.json` | TypeScript config (@ alias to src/) |
| `tsconfig.tsbuildinfo` | TS build cache |
| `next.config.ts` | Next.js config |
| `eslint.config.mjs` | ESLint config |
| `postcss.config.mjs` | Tailwind/PostCSS |
| `vercel.json` | Vercel deployment |
| `.env.local` | Environment secrets |
| `.env.local.example` | Env template |
| `.gitignore` | Git ignore |
| `next-env.d.ts` | Next.js auto-generated types |

## Documentation & Data (2 files)

| File | Purpose |
|------|---------|
| `BIBLE.md` | Complete project spec |
| `migration.sql` | Initial DB schema |
| `bumpr_full_dump.sql` | Full DB backup |

## Scripts (2 files)

| File | Purpose |
|------|---------|
| `scripts/seed-villas.mjs` | Seed test villas |
| `scripts/seed-villa-photos.mjs` | Seed villa photos |
