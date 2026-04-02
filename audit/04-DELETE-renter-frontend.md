# DELETE — Renter Frontend (23 files)

> All renter UI is moving to Expo. These files have NO API route or admin dependencies.

## Renter Pages (8 files)

| File | What It Is | Imports From Shared |
|------|-----------|-------------------|
| `src/app/(public)/page.tsx` | Landing page | next/link |
| `src/app/(public)/layout.tsx` | Public layout wrapper | (none) |
| `src/app/(public)/browse/page.tsx` | Villa browse/search | supabase/server, BrowseClient |
| `src/app/(public)/villa/[id]/page.tsx` | Villa detail view | supabase/server+admin, PhotoGallery, VillaDetailClient, AmenityList, formatIdr, types |
| `src/app/(public)/renter/page.tsx` | Renter info landing | next/link |
| `src/app/(app)/bookings/page.tsx` | Renter bookings list | getUserRole, createAdminClient, **StatusBadge** |
| `src/app/(app)/booking/[id]/page.tsx` | Booking detail | getUserRole, createAdminClient, **StatusBadge**, BookingSummary, ProtectionTimer, BookingDetailClient, formatDate, formatIdr |
| `src/app/(app)/booking/[id]/bumped/page.tsx` | Bumped notification | getUserRole, createAdminClient, BumpDeadlineTimer, BumpedScreenClient, formatIdr |

> StatusBadge is shared with admin — see 07-FLAG. Deleting these pages does NOT require deleting StatusBadge.

## Renter Components (13 files)

| File | What It Is | Imports |
|------|-----------|---------|
| `src/components/renter/AmenityList.tsx` | Amenity display | `@/lib/amenities` |
| `src/components/renter/BookingDetailClient.tsx` | Booking detail client | useState, useRouter |
| `src/components/renter/BookingSummary.tsx` | Pricing summary card | formatIdr |
| `src/components/renter/BrowseClient.tsx` | Browse/search UI w/ map | useState, useRouter, MapView, VillaPreviewCard, VillaCard |
| `src/components/renter/BumpDeadlineTimer.tsx` | Bump response countdown | useState, useEffect |
| `src/components/renter/BumpedScreenClient.tsx` | Post-bump screen | useState, useRouter, next/link |
| `src/components/renter/MapView.tsx` | Mapbox map | mapbox-gl |
| `src/components/renter/PhotoGallery.tsx` | Photo gallery | useState, useRef |
| `src/components/renter/PriceDisplay.tsx` | Price formatter | formatIdr |
| `src/components/renter/ProtectionTimer.tsx` | Protection countdown | useState, useEffect |
| `src/components/renter/VillaCard.tsx` | Search result card | next/link, formatIdr |
| `src/components/renter/VillaDetailClient.tsx` | Villa detail client | useState, useRouter, formatIdr, calculateNights |
| `src/components/renter/VillaPreviewCard.tsx` | Compact villa preview | formatIdr |

## Auth Pages (2 files)

| File | What It Is | Imports |
|------|-----------|---------|
| `src/app/login/page.tsx` | Login page | useState, supabase/client, next/link |
| `src/app/signup/page.tsx` | Signup page | useState, supabase/client, next/link |

> Auth for Expo is handled differently (OTP/phone). These web login/signup pages are not needed.
