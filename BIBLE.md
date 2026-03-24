# BUMPR PROJECT BIBLE
## The Complete Technical Specification — v1 MVP

> **This document is the single source of truth for the Bumpr build.**
> Every Claude Code session must read this file before writing any code.
> If this document says one thing and your instinct says another, follow this document.

---

## 1. WHAT IS BUMPR

Bumpr (bumpr.rent) is a marketplace for standby villa rentals in Bali. Villa owners list empty villas at 25–30% of normal nightly rates. Renters get affordable villa living but accept that they may be "bumped" — evicted with minimum 18 hours notice — if the owner secures a full-price booking on another platform (Airbnb, Booking.com, etc).

The bump mechanic is the core product differentiator. It cannot be faked, simplified, or worked around. Every technical decision flows from making the bump experience seamless, fair, and trustworthy for both parties.

---

## 2. TECH STACK — NO DEVIATIONS

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14+ App Router | TypeScript, strict mode |
| Database | Supabase (PostgreSQL 15+) | With PostGIS extension |
| Auth | Supabase Auth | Email + Google OAuth |
| Realtime | Supabase Realtime | For bump notifications, booking updates |
| Storage | Supabase Storage | Villa photos (admin-uploaded in v1) |
| Edge Functions | Supabase Edge Functions | Webhooks, cron jobs, iCal polling |
| Styling | Tailwind CSS | Mobile-first |
| Maps | Mapbox GL JS | Map-first villa browsing |
| Payments | Xendit | IDR only, credit cards only in v1 |
| Notifications | Twilio WhatsApp Business API | Pre-approved templates, notification-only |
| Hosting | Vercel | Next.js deployment |
| PWA | Mobile-first PWA | Not native app |

---

## 3. BRAND IDENTITY

| Element | Value |
|---------|-------|
| Fonts | Fraunces (serif headings), Outfit (body), JetBrains Mono (numbers/data) |
| Primary colors | Cream (#FFF8F0), Deep Teal (#1A5C5E), Sunset Amber / Bumpr Orange (#FFA314), Volcanic Black (#1A1A1A) |
| Palette name | "Faded Polaroid" |
| Aesthetic | Tropical editorial meets playful rebel. Grain texture. Warm, breathable, premium lifestyle — NOT dark, techy, or generic SaaS. |
| Tone | Short, direct, warm. No filler language. |

---

## 4. BUSINESS RULES — NON-NEGOTIABLE

These rules are absolute. Do not deviate, simplify, or skip any of them.

### 4.1 The Bump

- Minimum bump notice: **18 hours**. Owners can set longer (stored as `bump_notice_hours` on the villa, minimum value 18).
- **Bumps are irreversible.** Once triggered, there is no cancellation window. The owner confirms via a dialog ("This will notify your guest — are you sure?") before triggering.
- Bump trigger is **manual** (owner presses a button and selects which external platform the booking came from). iCal sync **verifies** the external booking afterward — it does not trigger bumps.
- If iCal does not verify the external booking within the next sync cycle, the bump is **flagged for admin review** but not auto-blocked.

### 4.2 Protection Windows

| Scenario | Unbumpable window | Then |
|----------|------------------|------|
| Initial check-in | 12 hours from check-in time | Standard bump notice applies |
| After rebook (bumped renter books new villa) | 6 hours from new check-in | Standard bump notice applies |

- Protection starts at the **earliest possible check-in time** set by the owner (e.g., 2pm), NOT when the renter physically arrives and NOT when they booked.
- If check-in is available immediately, protection starts immediately.
- `protection_ends_at` is computed and stored on the booking record.

### 4.3 Check-in

- The owner sets a `check_in_by` time on the villa (latest allowed check-in, e.g., 8pm).
- Check-in is a **renter action** — they tap "I've arrived" in the app.
- Auto-transition fallback: if renter hasn't checked in by the owner's earliest check-in time, the system transitions the booking to `active` and starts protection automatically.
- Check-in is visible to both parties.

### 4.4 Booking Requests

- Booking is request/approval. Renter requests → owner has **15 minutes** to approve.
- If owner doesn't respond in 15 minutes, Bumpr team calls the owner manually (not automated in v1).
- If still no response, request **expires** and renter is notified.
- A renter can have a **maximum of 3 active bookings** at any time.

### 4.5 Advance Bookings

- Renters can book villas in advance (e.g., 3 days from now).
- The villa is reserved **internally on Bumpr** (other Bumpr renters cannot book the same dates).
- The villa is **NOT blocked on external platforms** for future dates.
- If a full-price external booking comes in **before the renter checks in**, this is a **pre-check-in cancellation** — NOT a bump. Full refund, renter notified to rebook.
- If a full-price external booking comes in **during the stay after protection**, this is a **bump**.

### 4.6 Pre-Check-in Cancellation vs Bump

| Situation | Classification | Refund |
|-----------|---------------|--------|
| External booking before renter checks in | Pre-check-in cancellation | Full refund (charge + service fee) |
| External booking during stay, after protection | Bump | Pro-rata: unused nights + service fee on unused nights |

### 4.7 Pricing & Payments

- Owner sets price in **IDR only**.
- App displays approximate conversion to renter's preferred currency using cached exchange rates (with "≈" prefix).
- Exchange rate is **locked on the booking record** at confirmation time.
- All Xendit charges are processed in **IDR**.
- **15% service fee** charged to renter on top of the nightly rate.
- Service fee on unused nights (due to bump) is **refunded** to the renter.
- Bumpr keeps 15% only on nights actually stayed.

### 4.8 Escrow Model

1. Renter books → Bumpr charges full amount (all nights + 15% service fee) via Xendit.
2. Funds sit in Bumpr's Xendit account balance (this is the "escrow").
3. On normal check-out → owner gets paid: nights × nightly rate. Bumpr keeps service fee.
4. On bump → owner gets paid for nights stayed. Renter gets refund for unused nights + service fee on unused nights.
5. Renter's new booking after a bump is a **completely separate transaction**. No netting, no credits, no wallet.

### 4.9 Owner Payouts

- Per-booking payouts (not batched).
- Triggered at check-out (normal) or bump resolution.
- Disbursed via Xendit to owner's Indonesian bank account.
- Disbursement fee (~5,500 IDR/transaction) absorbed by Bumpr.

---

## 5. OUTBOUND iCAL BLOCKING RULES

This is critical to the product model. Get this wrong and the entire mechanic breaks.

**Bumpr's outbound iCal feed per villa shows "busy" ONLY for real-time physical occupancy.**

| Situation | What is blocked on external calendars |
|-----------|--------------------------------------|
| Renter has a future standby booking (not yet checked in) | NOTHING blocked. Villa remains fully bookable on Airbnb. |
| Check-in day | Block check-in day + 12-hour protection window |
| During active stay (no bump) | Block current night + 20 hours ahead (18hr bump notice + 2hr buffer) |
| Bump triggered, renter still in villa | Block current night + next night (renter has 18hr to leave) |
| After renter leaves | Block removed. Full-price booking takes over. |

**The outbound iCal is a real-time occupancy signal, NOT a reservation block.** It says "someone is physically here right now" — never "this villa is reserved for the future."

---

## 6. INBOUND iCAL SYNC

- Poll each villa's external iCal feed every **30 minutes**.
- Parse busy periods → store in `external_availability` table.
- On each sync: **DELETE all records** for the villa, INSERT fresh parsed data. No history.
- Update `ical_last_synced_at` and `ical_sync_status` on the villa.
- If sync fails, set `ical_sync_status = 'error'`. Flag for admin if stale > 24 hours.
- One bad iCal URL must not crash the entire batch — handle errors per-villa.

---

## 7. STATE MACHINES

### 7.1 Booking Status

```
requested
  → approved (owner approves within 15 min)
  → expired (owner doesn't respond)
  → cancelled (renter cancels before check-in)

approved
  → confirmed (payment succeeds)
  → cancelled (payment fails or renter cancels)

confirmed
  → active (renter checks in — protection starts)
  → pre_checkin_cancelled (external booking before check-in — full refund)
  → cancelled (renter cancels)

active
  → bumped (owner triggers bump after protection window)
  → completed (normal check-out)

bumped
  → completed (renter leaves, refund + payout processed)
```

Valid status values: `requested`, `approved`, `confirmed`, `active`, `bumped`, `completed`, `cancelled`, `expired`, `pre_checkin_cancelled`

### 7.2 Bump Status

```
active (bump triggered, renter notified)
  → resolved (renter left, financials processed)
  → admin_review (iCal unverified or dispute)
```

### 7.3 Renter Response to Bump

```
null (no response yet)
  → rebooking (renter browsing alternatives)
  → accepted_deadline (staying until deadline)
  → left_early (left before deadline)
```

---

## 8. DATABASE SCHEMA

All tables use `uuid` primary keys (auto-generated). All timestamps are `timestamptz`. All tables have RLS enabled.

### 8.1 profiles

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | References auth.users.id |
| full_name | text NOT NULL | |
| email | text NOT NULL | Denormalized from auth |
| phone | text | WhatsApp number with country code |
| avatar_url | text | |
| preferred_currency | text DEFAULT 'USD' | ISO 4217 |
| is_admin | boolean DEFAULT false | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 8.2 owner_profiles

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | References profiles.id (one-to-one) |
| business_name | text | Optional |
| bank_name | text | For Xendit payouts |
| bank_account_number | text | Encrypted |
| bank_account_holder | text | |
| xendit_customer_id | text | |
| id_type | text | KTP / Passport |
| id_number | text | Encrypted |
| verified | boolean DEFAULT false | Admin-verified |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 8.3 villas

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| owner_id | uuid FK NOT NULL | References owner_profiles.id |
| title | text NOT NULL | |
| description | text | |
| area | text NOT NULL | canggu, seminyak, ubud, uluwatu, etc |
| location | geography(Point,4326) | PostGIS point |
| address | text | Shown after booking confirmation |
| bedrooms | int NOT NULL | |
| bathrooms | int | |
| max_guests | int NOT NULL | |
| standby_rate_idr | bigint NOT NULL | Nightly rate set by owner |
| bump_notice_hours | int NOT NULL DEFAULT 18 | Minimum 18, owner can set higher |
| check_in_by | time | Latest allowed check-in (e.g., 20:00) |
| earliest_check_in | time | Earliest check-in (e.g., 14:00) — protection starts here |
| amenities | jsonb DEFAULT '[]' | Array of tags |
| status | text NOT NULL DEFAULT 'draft' | draft / active / paused / delisted |
| ical_url | text | External calendar feed URL |
| ical_last_synced_at | timestamptz | |
| ical_sync_status | text DEFAULT 'pending' | ok / pending / error |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 8.4 villa_photos

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| villa_id | uuid FK NOT NULL | CASCADE delete |
| url | text NOT NULL | Supabase Storage URL |
| sort_order | int NOT NULL DEFAULT 0 | 0 = hero photo |
| caption | text | Nullable, v2 feature |
| created_at | timestamptz | |

### 8.5 bookings

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| villa_id | uuid FK NOT NULL | |
| renter_id | uuid FK NOT NULL | References profiles.id |
| check_in | date NOT NULL | |
| check_out | date NOT NULL | |
| nights | int NOT NULL | check_out - check_in |
| nightly_rate_idr | bigint NOT NULL | Locked at booking time |
| total_amount_idr | bigint NOT NULL | nightly_rate × nights |
| service_fee_idr | bigint NOT NULL | 15% of total_amount |
| total_charged_idr | bigint NOT NULL | total_amount + service_fee |
| fx_rate_to_renter | numeric(12,4) | Locked at booking |
| renter_currency | text DEFAULT 'USD' | |
| status | text NOT NULL DEFAULT 'requested' | See state machine §7.1 |
| checked_in_at | timestamptz | Actual check-in. Starts protection. |
| protection_ends_at | timestamptz | checked_in_at + 12hr (or +6hr for rebook) |
| is_rebook | boolean DEFAULT false | |
| original_booking_id | uuid FK | If rebook, references bumped booking |
| approved_at | timestamptz | |
| completed_at | timestamptz | |
| cancelled_at | timestamptz | |
| cancellation_reason | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 8.6 bumps

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_id | uuid FK NOT NULL | |
| villa_id | uuid FK NOT NULL | Denormalized |
| owner_id | uuid FK NOT NULL | Who triggered |
| renter_id | uuid FK NOT NULL | Denormalized |
| triggered_at | timestamptz NOT NULL | |
| external_platform | text | airbnb / booking_com / direct / other |
| ical_verified | boolean DEFAULT false | |
| ical_verified_at | timestamptz | |
| deadline | timestamptz NOT NULL | triggered_at + bump_notice_hours |
| nights_stayed | int | Calculated at resolution |
| nights_refunded | int | |
| renter_response | text | rebooking / accepted_deadline / left_early |
| renter_responded_at | timestamptz | |
| replacement_booking_id | uuid FK | New booking if renter rebooked |
| status | text NOT NULL DEFAULT 'active' | active / resolved / admin_review |
| resolved_at | timestamptz | |
| admin_notes | text | |
| created_at | timestamptz | |

### 8.7 payments

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_id | uuid FK NOT NULL | |
| type | text NOT NULL | charge / refund / payout |
| amount_idr | bigint NOT NULL | |
| description | text | Human-readable |
| xendit_payment_id | text | |
| xendit_status | text | |
| status | text NOT NULL DEFAULT 'pending' | pending / processing / completed / failed |
| created_at | timestamptz | |
| completed_at | timestamptz | |

### 8.8 payouts

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| owner_id | uuid FK NOT NULL | |
| booking_id | uuid FK NOT NULL | |
| payment_id | uuid FK | References payments.id |
| amount_idr | bigint NOT NULL | |
| nights_paid | int NOT NULL | |
| status | text NOT NULL DEFAULT 'pending' | pending / processing / completed / failed |
| xendit_disbursement_id | text | |
| scheduled_at | timestamptz | |
| completed_at | timestamptz | |
| created_at | timestamptz | |

### 8.9 external_availability

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| villa_id | uuid FK NOT NULL | CASCADE delete |
| source | text NOT NULL | airbnb / booking_com / other |
| blocked_start | date NOT NULL | |
| blocked_end | date NOT NULL | |
| summary | text | iCal event summary |
| synced_at | timestamptz NOT NULL | |

### 8.10 notifications

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK NOT NULL | |
| booking_id | uuid FK | |
| bump_id | uuid FK | |
| channel | text NOT NULL | whatsapp / in_app / email |
| template | text NOT NULL | Template identifier |
| message_body | text | Rendered content for audit |
| status | text NOT NULL DEFAULT 'pending' | pending / sent / delivered / read / failed |
| twilio_message_sid | text | |
| error_message | text | |
| sent_at | timestamptz | |
| delivered_at | timestamptz | |
| created_at | timestamptz | |

### 8.11 exchange_rates

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| currency_code | text NOT NULL UNIQUE | ISO 4217 |
| rate_from_idr | numeric(18,8) NOT NULL | 1 IDR = X target currency |
| source | text DEFAULT 'xendit' | |
| fetched_at | timestamptz NOT NULL | |

### 8.12 conversations

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| booking_id | uuid FK NOT NULL UNIQUE | One conversation per booking |
| villa_id | uuid FK NOT NULL | |
| renter_id | uuid FK NOT NULL | |
| owner_id | uuid FK NOT NULL | |
| created_at | timestamptz | |

### 8.13 messages

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| conversation_id | uuid FK NOT NULL | |
| sender_id | uuid FK NOT NULL | |
| body | text NOT NULL | Text only in v1 |
| read_at | timestamptz | NULL = unread |
| created_at | timestamptz | |

---

## 9. INDEXES

| Table | Index | Purpose |
|-------|-------|---------|
| villas | (area, status) | Browse by neighborhood |
| villas | GIST (location) | PostGIS proximity queries |
| villas | (owner_id) | Owner dashboard |
| bookings | (villa_id, status) | Owner: bookings on my villa |
| bookings | (renter_id, status) | Renter: my bookings |
| bookings | (villa_id, check_in, check_out) | Availability / conflict detection |
| bookings | (status) WHERE status = 'active' | Partial: active bookings for bump eligibility |
| bumps | (booking_id) | Bump history per booking |
| bumps | (villa_id, status) | Active bumps per villa |
| external_availability | (villa_id, blocked_start, blocked_end) | Calendar overlap detection |
| payments | (booking_id, type) | Payments per booking |
| payouts | (owner_id, status) | Owner payout history |
| notifications | (user_id, created_at DESC) | User notification feed |
| notifications | (bump_id) | Audit: all notifications for a bump |

---

## 10. ROW LEVEL SECURITY

All tables have RLS enabled. Admin access via `profiles.is_admin = true`.

| Table | Read | Write |
|-------|------|-------|
| profiles | Own record. Admins: all. | Own record only. |
| owner_profiles | Own record. Admins: all. | Own record only. |
| villas | Active: public. Own: owner. Admins: all. | Admin only in v1 (admin creates listings). |
| villa_photos | Same as parent villa. | Admin only in v1. |
| bookings | Own bookings: renter. On own villas: owner. Admins: all. | Create: renter. Update status: owner + admin. |
| bumps | Own bumps (as owner or renter). Admins: all. | Create: owner. Update: system + admin. |
| payments | Related to own bookings. Admins: all. | System only (Edge Functions). |
| payouts | Own payouts: owner. Admins: all. | System only. |
| notifications | Own notifications. Admins: all. | System only. |
| exchange_rates | Public read-only. | System only. |
| external_availability | Own villas: owner. Admins: all. | System only (sync job). |

---

## 11. XENDIT INTEGRATION

### 11.1 Products Required
- Payment Gateway (credit card charges)
- Disbursements (owner bank payouts)
- Refunds (partial refunds on bumps)

### 11.2 Payment Methods (v1)
- Credit/debit cards only (Visa, Mastercard)
- Xendit hosted checkout page (handles 3DS, PCI compliance)

### 11.3 Currency
- All charges in IDR
- Renter's bank handles FX conversion

### 11.4 Webhook Endpoints

| Event | Endpoint | Action |
|-------|----------|--------|
| payment.succeeded | /api/webhooks/xendit/payment | Booking → confirmed. Create payment record. Send notifications. |
| payment.failed | /api/webhooks/xendit/payment | Log failure. Booking stays approved. Renter can retry. |
| refund.succeeded | /api/webhooks/xendit/refund | Update payment record. Notify renter. |
| refund.failed | /api/webhooks/xendit/refund | Flag for admin. |
| disbursement.succeeded | /api/webhooks/xendit/disbursement | Payout → completed. Notify owner. |
| disbursement.failed | /api/webhooks/xendit/disbursement | Flag for admin. Queue retry. |

**All webhooks must be signature-verified using Xendit's verification token.**

---

## 12. WHATSAPP NOTIFICATIONS

### 12.1 Configuration
- Twilio as API layer
- Business-initiated messages only (templates, no freeform)
- Deep link buttons back to app on every template
- Delivery status tracked via Twilio webhooks → notifications table
- If WhatsApp delivery fails → in-app notification as fallback
- If bump alert delivery fails → admin alerted immediately

### 12.2 Templates

| # | Name | Sent to | Trigger |
|---|------|---------|---------|
| 1 | booking_request_owner | Owner | Renter submits booking request |
| 2 | booking_confirmed_renter | Renter | Payment processed |
| 3 | booking_confirmed_owner | Owner | Booking confirmed |
| 4 | bump_alert_renter | Renter | **Owner triggers bump — CRITICAL** |
| 5 | bump_confirmed_owner | Owner | Bump triggered |
| 6 | renter_rebooked | Renter | New villa confirmed after bump |
| 7 | renter_rebooked_owner | Owner | Bumped renter leaving |
| 8 | checkin_reminder | Renter | Day before check-in |
| 9 | payout_completed_owner | Owner | Disbursement complete |
| 10 | checkout_reminder | Renter | Day before check-out |

---

## 13. SCHEDULED JOBS (Edge Functions / Cron)

| Job | Frequency | Action |
|-----|-----------|--------|
| iCal sync | Every 30 minutes | Poll all active villas' iCal URLs. Parse. Update external_availability. |
| Exchange rate refresh | Daily (morning) | Fetch rates from Xendit/fallback API. Update exchange_rates table. |
| Booking request expiry | Every minute | Find `requested` bookings older than 15 minutes. Set to `expired`. Notify renter. |
| Auto check-in | Every 15 minutes | Find `confirmed` bookings where current time >= villa's earliest_check_in on check-in date. Transition to `active`. Set protection_ends_at. |
| Check-out processing | Every 15 minutes | Find `active` bookings past check-out date. Transition to `completed`. Trigger owner payout. |
| Bump deadline enforcement | Every 15 minutes | Find `bumped` bookings past deadline. Transition to `completed`. Process refund + payout. |
| iCal stale check | Every hour | Flag villas where ical_last_synced_at > 24 hours ago. |

---

## 14. REALTIME SUBSCRIPTIONS

Subscribe to Supabase Realtime changes on:

| Table | Filter | Who subscribes | Purpose |
|-------|--------|---------------|---------|
| bookings | renter_id = current user | Renter | Booking status changes, bump alerts |
| bookings | villa_id IN owner's villas | Owner | New booking requests, status changes |
| bumps | renter_id = current user | Renter | Bump triggered, status updates |
| bumps | owner_id = current user | Owner | Bump resolution updates |
| notifications | user_id = current user | Both | New notification indicator |

---

## 15. PAGE STRUCTURE

### 15.1 Auth determines role. No role switcher.

- If user has `owner_profiles` record → owner experience
- If user has no `owner_profiles` record → renter experience
- If user has `profiles.is_admin = true` → admin experience
- Owners cannot switch to renter view (v1). Renters cannot switch to owner.

### 15.2 Public Pages (no auth)

| Route | Purpose |
|-------|---------|
| / | Landing splitter: "I'm a villa owner" / "I'm looking for a villa" |
| /renter | Renter landing page |
| /owner | Owner landing page (Bahasa default, English toggle) |
| /login | Email + Google OAuth |
| /signup | Registration → defaults to renter |

### 15.3 Renter Pages

| Route | Purpose |
|-------|---------|
| /browse | Map-first (Mapbox). Filter by area, dates, bedrooms, price. |
| /villa/[id] | Detail: photos, description, amenities, rate (renter currency), bump notice hours. "Request to book" CTA. |
| /booking/[id] | Detail: status, dates, protection timer (live countdown), payment. |
| /booking/[id]/bumped | Bump screen: deadline countdown, available alternatives pre-filtered. |
| /bookings | List: active, upcoming, past. |
| /messages | Conversations list with previews and unread counts. |
| /profile | Edit name, phone, preferred currency. |

### 15.4 Owner Pages

| Route | Purpose |
|-------|---------|
| /dashboard | Home: villas, active bookings, recent bumps, earnings summary. |
| /villa/[id]/manage | View calendar, active bookings. (Editing is admin-only in v1.) |
| /villa/[id]/bump | Trigger bump: select booking, confirm platform, confirmation dialog. |
| /messages | Conversations list with previews and unread counts. |
| /earnings | Payout history, per-booking breakdown. |

### 15.5 Admin Pages

| Route | Purpose |
|-------|---------|
| /admin | Dashboard: key metrics, flagged items. |
| /admin/villas | All villas. Table with filters. Create / edit / approve / delist. |
| /admin/villas/new | Create villa form (onboarding the 84 villas). |
| /admin/villas/[id]/edit | Edit details, upload photos, set rates. |
| /admin/bookings | All bookings. Filter by status, villa, date. Manual overrides. |
| /admin/bumps | All bumps. Verification status, flags. |
| /admin/payments | Payments + payouts. Failed transactions, pending refunds. |
| /admin/users | User list. Verify owners. |

---

## 16. KEY COMPONENTS

| Component | Used in | Purpose |
|-----------|---------|---------|
| VillaCard | Browse, rebook, dashboard | Photo, name, area, rate, bedrooms |
| BookingStatusBadge | Bookings list, booking detail | Color-coded status tag |
| ProtectionTimer | Booking detail | Live countdown of remaining protection |
| BumpDeadlineTimer | Bumped screen | Countdown to bump deadline |
| MapView | Browse page | Mapbox with clustering, viewport-driven loading |
| NotificationBell | Nav (all roles) | Realtime notification indicator |
| CurrencyDisplay | Villa detail, booking, earnings | Format IDR + approximate renter currency |

---

## 17. MAPBOX INTEGRATION

- `/browse` page is map-first.
- Villa markers clustered at zoom-out, individual at zoom-in.
- Clicking marker shows preview card (VillaCard).
- Map viewport drives the query — fetch villas within visible bounds using PostGIS.
- Backend query: `SELECT * FROM villas WHERE status = 'active' AND ST_Within(location, ST_MakeEnvelope(west, south, east, north, 4326))`
- Date filter: exclude villas with confirmed/active bookings overlapping selected dates.
- Show standby rate on marker in renter's currency with "≈" prefix.

---

## 18. V1 SCOPE — WHAT'S IN, WHAT'S OUT

### IN for v1
- Owner onboarding (admin creates listings)
- Villa listings with photos
- Map-first renter browsing
- Booking request/approval flow (15-min expiry)
- Full bump lifecycle (trigger → notify → rebook)
- Xendit payments (credit cards, IDR)
- Escrow model (charge at booking, payout at checkout/bump)
- WhatsApp notifications (10 templates)
- iCal inbound sync (30-min polling)
- Outbound iCal (real-time occupancy signal)
- Protection timers (12hr initial, 6hr rebook)
- Pre-check-in cancellation flow
- Admin dashboard (tables, filters, manual actions)
- Exchange rate display (daily refresh)
- Supabase Realtime for bump/booking notifications

### OUT for v1 (do not build)
- Priority Rebook Pass ($9.99/mo subscription)
- Owner Boost ($29/mo)
- Villa Verified Badge ($49)
- Insurance add-on
- Reviews system
- Advanced analytics dashboard
- Hotel guarantee (automated)
- Owner self-serve listing creation (admin does it)
- Owner self-serve photo upload (admin does it)
- Two-way WhatsApp conversations
- Multi-currency Xendit charges
- E-wallet / QRIS payments
- Automated phone calls to owners
- Email notifications
- Native mobile app

---

## 19. CLAUDE CODE SESSION GUIDE

### How to use this bible

1. **Start every session** by reading this file: `Read BIBLE.md`
2. **Work in focused layers** — don't try to build everything at once
3. **After each session** — verify the output matches this document
4. **If in doubt** — follow this document, not your instincts

### Recommended build order

**Layer 1: Foundation**
- Next.js project setup with TypeScript
- Supabase connection and client
- Auth: email + Google OAuth
- Complete database migrations (all 11 tables)
- RLS policies
- PostGIS extension
- Seed data for development

**Layer 2: Core Data Layer**
- TypeScript service functions for all CRUD operations
- Booking state machine with validation (enforce valid transitions)
- Bump state machine with validation
- Protection window calculations
- Availability conflict detection
- All business rule enforcement at the service layer

**Layer 3: Scheduled Jobs**
- iCal sync Edge Function
- Exchange rate refresh Edge Function
- Booking expiry job
- Auto check-in job
- Check-out processing job
- Bump deadline enforcement job
- iCal stale check job

**Layer 4: Integrations**
- Xendit charge flow (hosted checkout)
- Xendit refund flow
- Xendit disbursement flow
- Xendit webhook handlers (with signature verification)
- Twilio WhatsApp notification sender
- Twilio delivery webhook handler
- Notification fallback logic (WhatsApp fail → in-app)

**Layer 5: Admin UI**
- Admin layout and navigation
- Villa CRUD (create, edit, photos, approve)
- Bookings table view with filters
- Bumps table view with flags
- Payments/payouts overview
- Users management
- Key metrics dashboard

**Layer 6: Owner UI**
- Owner dashboard (villas, bookings, bumps, earnings)
- Villa management view (calendar, bookings)
- Bump trigger flow (with confirmation dialog)
- Earnings/payout history

**Layer 7: Renter UI**
- Map-first browse (Mapbox, viewport queries, clustering)
- Villa detail page
- Booking request flow
- Booking detail with protection timer
- Bump screen with deadline countdown and rebook
- Bookings list
- Profile page

**Layer 8: Realtime & Polish**
- Supabase Realtime subscriptions
- Notification bell component
- Live protection/deadline timers
- PWA configuration
- Mobile responsive polish
- Error handling and loading states

---

## 20. VALIDATION RULES — ENFORCE IN CODE

These must be checked before any database write:

- `bump_notice_hours` minimum value: 18
- `protection_ends_at` must be in the future before allowing a bump on a booking
- A bump can only be triggered on a booking with status `active`
- A bump can only be triggered after `protection_ends_at` has passed
- A booking request expires after 15 minutes if not approved
- A renter cannot have more than 3 bookings with status in (`requested`, `approved`, `confirmed`, `active`)
- A villa cannot have overlapping confirmed/active bookings on the same dates (on Bumpr)
- A rebook booking gets `is_rebook = true` and `protection_ends_at = checked_in_at + 6 hours`
- Refund amount = (unused nights × nightly_rate_idr) + (unused nights × (service_fee_idr / nights))
- Owner payout amount = nights_stayed × nightly_rate_idr
- Booking status transitions must follow the state machine in §7.1 — reject invalid transitions

---

*Last updated: March 2026*
*Version: 1.0 — MVP*
