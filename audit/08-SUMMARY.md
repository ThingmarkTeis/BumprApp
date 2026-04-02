# Audit Summary

## File Counts

| Category | Files | Action |
|----------|-------|--------|
| KEEP — API Routes | 56 | No changes |
| KEEP — Admin Dashboard | 19 | No changes |
| KEEP — Shared Infrastructure | ~65 | No changes |
| DELETE — Renter Frontend | 23 | Delete |
| DELETE — Owner Frontend | 12 | Delete |
| DELETE — Shared Frontend | ~12 | Delete |
| FLAG — Needs Refactor | 5 | Refactor first |
| **Total** | **~192** | |

## Safe Deletion Order

> Do the refactors FIRST, then delete in this order.

### Phase 0: Refactor (must do first)

1. `src/app/layout.tsx` — remove ServiceWorkerRegister import
2. `src/app/(app)/layout.tsx` — remove AppNav + RealtimeProvider
3. Decide on RealtimeProvider and profile page (see 07-FLAG)

### Phase 1: Delete renter components (13 files)

```
rm -rf src/components/renter/
```

### Phase 2: Delete owner components (7 files)

```
rm -rf src/components/owner/
```

### Phase 3: Delete navigation (1 file)

```
rm src/components/nav/AppNav.tsx
```

### Phase 4: Delete renter/owner pages

```
rm -rf src/app/(public)/
rm src/app/(app)/bookings/page.tsx
rm -rf src/app/(app)/booking/
rm src/app/(app)/dashboard/page.tsx
rm src/app/(app)/earnings/page.tsx
rm src/app/(app)/profile/page.tsx        # if admin doesn't need it
rm -rf src/app/(app)/villa/
rm src/app/login/page.tsx
rm src/app/signup/page.tsx
```

### Phase 5: Delete shared frontend

```
rm src/components/providers/ServiceWorkerRegister.tsx
rm src/components/providers/RealtimeProvider.tsx    # if admin doesn't need realtime
rm src/components/ui/Skeleton.tsx
rm src/components/ui/Toast.tsx                      # if RealtimeProvider removed
rm src/hooks/useToast.ts                            # if Toast removed
rm src/lib/realtime/subscriptions.ts                # if RealtimeProvider removed
rm src/app/error.tsx
rm src/app/not-found.tsx
```

### Phase 6: Delete PWA assets

```
rm public/icon.svg
rm public/logo-white.png
rm public/manifest.json
rm public/sw.js
rm BumprWhiteLogo.png
```

### Phase 7: Cleanup

- Remove mapbox-gl from package.json (only used by renter MapView)
- Review package.json for other renter/owner-only deps
- Verify `npm run build` passes
- Verify all admin pages render correctly
- Verify all API routes respond correctly

## Packages to review for removal after cleanup

| Package | Used By | Delete? |
|---------|---------|---------|
| `mapbox-gl` | MapView.tsx (renter) | Yes |
| Any PWA-related deps | ServiceWorkerRegister | Yes |
| `@supabase/ssr` | supabase/server.ts, middleware — still needed | No |
| `twilio` | WhatsApp integration — still needed | No |
| `zod` | Validations — still needed | No |
