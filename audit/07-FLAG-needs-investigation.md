# FLAG — Needs Investigation (5 critical items)

> These files are imported by BOTH deletable frontend AND keepable API/admin code.
> They must be refactored BEFORE any deletions or things will break.

---

## 1. `src/app/(app)/layout.tsx` — CRITICAL

**The problem:** This is the authenticated app layout that wraps ALL `(app)` routes — including admin.

**Current imports:**
- `getUserRole`, `createAdminClient` (KEEP — admin needs these)
- `AppNav` from `@/components/nav/AppNav` (DELETE — renter/owner nav)
- `RealtimeProvider` from `@/components/providers/RealtimeProvider` (DELETE — see #3)

**What breaks if deleted:** All admin pages under `/(app)/admin/*` lose their auth guard and stop rendering.

**What breaks if left as-is:** After deleting AppNav and RealtimeProvider, this file has broken imports.

**Required action:** Refactor this layout:
1. Remove `AppNav` import and usage
2. Remove `RealtimeProvider` wrapping (or keep if admin needs realtime)
3. Keep the auth check (`getUserRole` / `redirect`)
4. Admin already has its own sub-layout at `admin/layout.tsx` with sidebar

---

## 2. `src/app/layout.tsx` — CRITICAL

**The problem:** Root layout for the entire Next.js app (all pages + API routes).

**Current imports:**
- `ServiceWorkerRegister` from `@/components/providers/ServiceWorkerRegister` (DELETE)
- Google fonts: Fraunces, Outfit, JetBrains Mono
- `./globals.css`

**What breaks if deleted:** Entire app stops working.

**What breaks if left as-is:** After deleting ServiceWorkerRegister, this file has a broken import.

**Required action:** Refactor:
1. Remove `ServiceWorkerRegister` import and usage
2. Keep fonts (admin uses them) or simplify
3. Keep globals.css import (admin needs Tailwind)

---

## 3. `src/components/providers/RealtimeProvider.tsx` — DECISION NEEDED

**The problem:** Provides Supabase realtime subscriptions. Currently wraps all `(app)` routes including admin.

**Current imports:**
- `@/lib/realtime/subscriptions` — subscribeToRenterBookings, subscribeToOwnerBookings, etc.
- `@/hooks/useToast`, `@/components/ui/Toast`
- `@/lib/supabase/types`, `@/lib/auth/get-user-role`

**Who uses it:**
- `src/app/(app)/layout.tsx` — wraps all authenticated routes
- `src/components/nav/AppNav.tsx` — calls `useRealtime()` hook (DELETE)

**Decision:** Does the admin dashboard need realtime updates?
- **If NO:** Remove RealtimeProvider from `(app)/layout.tsx`, then delete RealtimeProvider.tsx, subscriptions.ts, Toast.tsx, useToast.ts
- **If YES:** Refactor RealtimeProvider to only subscribe to admin-relevant channels, remove renter/owner subscriptions

---

## 4. `src/app/(app)/profile/page.tsx` — DECISION NEEDED

**The problem:** Shared profile page used by owners.

**Current imports:**
- `getUserRole`, `createAdminClient` (KEEP)
- `ProfileClient` from `@/components/owner/ProfileClient` (DELETE)

**Decision:** Does the admin dashboard need a profile page?
- **If NO:** Delete this page along with other owner pages
- **If YES:** Build a new admin-specific profile page (don't reuse ProfileClient)

---

## 5. Admin components used by deletable owner pages

These admin components are imported by owner pages that are being deleted. **The components themselves are SAFE to keep** because admin still uses them. No action needed — just awareness.

| Component | Admin Pages Using It | Owner Pages Using It (being deleted) |
|-----------|---------------------|--------------------------------------|
| `MetricCard` | admin/page.tsx (dashboard) | dashboard/page.tsx, earnings/page.tsx |
| `StatusBadge` | admin/page.tsx, admin/bookings, admin/villas/[id]/edit | bookings/page.tsx, booking/[id], villa/[id]/manage, earnings |
| `Pagination` | admin/bookings, admin/bumps, admin/payments, admin/users, admin/villas | earnings/page.tsx |

**No action needed.** After owner pages are deleted, these components simply have fewer consumers.

---

## Refactor checklist (do this BEFORE deleting anything)

```
[ ] 1. Edit src/app/layout.tsx — remove ServiceWorkerRegister
[ ] 2. Edit src/app/(app)/layout.tsx — remove AppNav and RealtimeProvider
[ ] 3. Decide: admin needs realtime? → remove or refactor RealtimeProvider
[ ] 4. Decide: admin needs profile page? → delete or rebuild
[ ] 5. THEN proceed with deletions in 04, 05, 06
```
