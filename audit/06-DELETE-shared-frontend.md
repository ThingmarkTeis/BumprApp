# DELETE — Shared Frontend (~12 files)

> Web-only UI infrastructure not used by API routes or admin.

## Navigation (1 file)

| File | What It Is | Why Delete |
|------|-----------|-----------|
| `src/components/nav/AppNav.tsx` | Main nav bar (renter/owner) | Only imported by `(app)/layout.tsx`. Admin has its own sidebar in `admin/layout.tsx`. |

## Providers (1 file)

| File | What It Is | Why Delete |
|------|-----------|-----------|
| `src/components/providers/ServiceWorkerRegister.tsx` | PWA service worker registration | Only imported by root `layout.tsx`. Admin doesn't need PWA. |

## UI Components (2 files)

| File | What It Is | Why Delete |
|------|-----------|-----------|
| `src/components/ui/Skeleton.tsx` | Loading skeleton | Not imported by any admin page or component |
| `src/components/ui/Toast.tsx` | Toast notifications | Only imported by RealtimeProvider — see FLAG |

## Hooks (1 file)

| File | What It Is | Why Delete |
|------|-----------|-----------|
| `src/hooks/useToast.ts` | Toast hook | Only imported by RealtimeProvider and Toast.tsx |

## Realtime (1 file)

| File | What It Is | Why Delete |
|------|-----------|-----------|
| `src/lib/realtime/subscriptions.ts` | Renter/owner realtime subscriptions | Only imported by RealtimeProvider. Not used by any API route. |

## PWA / Public Assets (4 files)

| File | What It Is |
|------|-----------|
| `public/icon.svg` | PWA icon |
| `public/logo-white.png` | Web logo |
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Service worker |

## Other (2 files)

| File | What It Is | Why Delete |
|------|-----------|-----------|
| `src/app/error.tsx` | Error boundary | Web frontend error page — admin can get its own if needed |
| `src/app/not-found.tsx` | 404 page | Web frontend 404 — admin can get its own if needed |
| `BumprWhiteLogo.png` | Brand logo asset | Web-only |

## Styling — needs refactor, not delete

| File | Note |
|------|------|
| `src/app/globals.css` | Tailwind import — admin still needs this. Keep but can simplify later. |
