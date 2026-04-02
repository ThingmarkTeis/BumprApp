# KEEP — Admin Dashboard (19 files)

> Internal tool at bumpr.online. Do NOT touch.

## Admin Pages (9 files)

| File | Purpose | Key Imports |
|------|---------|-------------|
| `src/app/(app)/admin/layout.tsx` | Admin layout + sidebar nav | getUserRole, getRoleRedirect, next/navigation |
| `src/app/(app)/admin/page.tsx` | Admin dashboard | createAdminClient, MetricCard, StatusBadge |
| `src/app/(app)/admin/bookings/page.tsx` | Booking management | createAdminClient, StatusBadge, FilterBar, Pagination, AdminBookingActions, formatIdr |
| `src/app/(app)/admin/bumps/page.tsx` | Bump/dispute review | createAdminClient, StatusBadge, FilterBar, Pagination, AdminBumpActions, formatDeadline |
| `src/app/(app)/admin/payments/page.tsx` | Payment monitoring | createAdminClient, StatusBadge, FilterBar, Pagination, AdminPaymentRetry, formatIdr |
| `src/app/(app)/admin/users/page.tsx` | User management | createAdminClient, StatusBadge, FilterBar, Pagination, AdminUserActions |
| `src/app/(app)/admin/villas/page.tsx` | Villa list | createAdminClient, StatusBadge, FilterBar, Pagination, formatIdr |
| `src/app/(app)/admin/villas/new/page.tsx` | Create villa | VillaForm, createAdminClient |
| `src/app/(app)/admin/villas/[id]/edit/page.tsx` | Edit villa | VillaForm, StatusBadge, createAdminClient, Database type |

## Admin Components (10 files)

| File | Purpose | Key Imports |
|------|---------|-------------|
| `src/components/admin/AdminBookingActions.tsx` | Booking action buttons | useRouter, ConfirmDialog |
| `src/components/admin/AdminBumpActions.tsx` | Bump dispute actions | useRouter, ConfirmDialog |
| `src/components/admin/AdminPaymentRetry.tsx` | Payment retry controls | useRouter, ConfirmDialog |
| `src/components/admin/AdminUserActions.tsx` | User management actions | useRouter, ConfirmDialog |
| `src/components/admin/ConfirmDialog.tsx` | Confirmation modal | useState |
| `src/components/admin/FilterBar.tsx` | Admin filtering UI | useRouter, useSearchParams, usePathname |
| `src/components/admin/MetricCard.tsx` | Dashboard metric card | (none — pure presentational) |
| `src/components/admin/Pagination.tsx` | Pagination controls | useRouter, useSearchParams, usePathname |
| `src/components/admin/StatusBadge.tsx` | Status indicator badge | (none — pure presentational) |
| `src/components/admin/VillaForm.tsx` | Villa create/edit form | useState, useRef, useRouter, formatIdr, AMENITIES, AMENITY_KEYS |

## Shared deps admin relies on

These are in `03-KEEP-shared-infrastructure.md` but for reference:
- `@/lib/supabase/admin` — used by every admin page
- `@/lib/supabase/types` — Database types
- `@/lib/auth/get-user-role` — admin layout auth guard
- `@/lib/utils/currency` — formatIdr (4 pages + VillaForm)
- `@/lib/utils/dates` — formatDeadline (bumps page)
- `@/lib/amenities` — AMENITIES, AMENITY_KEYS (VillaForm)
