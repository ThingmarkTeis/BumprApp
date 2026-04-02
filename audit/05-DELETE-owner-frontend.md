# DELETE — Owner Frontend (12 files)

> All owner UI is moving to Expo. These are web-only pages/components.

## Owner Pages (6 files)

| File | What It Is | Imports From Shared |
|------|-----------|-------------------|
| `src/app/(public)/owner/page.tsx` | Owner info landing | next/link |
| `src/app/(app)/dashboard/page.tsx` | Owner dashboard | getUserRole, createAdminClient, **MetricCard**, VillaOwnerCard, ActivityItem, formatIdr, types |
| `src/app/(app)/earnings/page.tsx` | Owner earnings/payouts | getUserRole, createAdminClient, **MetricCard**, **StatusBadge**, **Pagination**, formatIdr, types |
| `src/app/(app)/booking/[id]/approve/page.tsx` | Booking approval | getUserRole, createAdminClient, ApproveBookingClient, formatIdr, types |
| `src/app/(app)/villa/[id]/manage/page.tsx` | Villa management | getUserRole, createAdminClient, **StatusBadge**, VillaManageClient, formatIdr, types |
| `src/app/(app)/villa/[id]/bump/page.tsx` | Bump trigger flow | getUserRole, createAdminClient, BumpFlow, types |

> **Bold** = shared admin components. Deleting these pages does NOT require deleting those components.

## Owner Components (7 files)

| File | What It Is | Imports |
|------|-----------|---------|
| `src/components/owner/ActivityItem.tsx` | Activity log entry | (none — pure presentational) |
| `src/components/owner/ApproveBookingClient.tsx` | Booking approval flow | useState, useEffect, useRouter |
| `src/components/owner/BookingCalendar.tsx` | Calendar view | useState |
| `src/components/owner/BumpFlow.tsx` | Bump trigger confirmation | useState, useRouter, formatDeadline, next/link |
| `src/components/owner/ProfileClient.tsx` | Profile editor | useState, supabase/client |
| `src/components/owner/VillaManageClient.tsx` | Villa management client | useState, BookingCalendar, **StatusBadge**, formatIdr, next/link |
| `src/components/owner/VillaOwnerCard.tsx` | Owner villa card | next/link, formatIdr |
