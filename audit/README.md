# Bumprapp Cleanup Audit

> **Goal:** Convert bumprapp from a full web app into TWO things only:
> 1. API server (Next.js API routes the Expo app calls)
> 2. Admin dashboard (internal tool at bumpr.online)
>
> All renter and owner frontend UI is moving to the Expo app.

## Audit Files

| File | Contents |
|------|----------|
| [01-KEEP-api-routes.md](./01-KEEP-api-routes.md) | All API routes (Expo depends on these) |
| [02-KEEP-admin-dashboard.md](./02-KEEP-admin-dashboard.md) | Admin pages, layouts, components |
| [03-KEEP-shared-infrastructure.md](./03-KEEP-shared-infrastructure.md) | Supabase, auth, services, integrations, validations, types, config |
| [04-DELETE-renter-frontend.md](./04-DELETE-renter-frontend.md) | Renter pages + components |
| [05-DELETE-owner-frontend.md](./05-DELETE-owner-frontend.md) | Owner pages + components |
| [06-DELETE-shared-frontend.md](./06-DELETE-shared-frontend.md) | Nav, PWA, public assets, login/signup |
| [07-FLAG-needs-investigation.md](./07-FLAG-needs-investigation.md) | Files shared between keep/delete — refactor required |
| [08-SUMMARY.md](./08-SUMMARY.md) | Counts, safe deletion order, critical refactor tasks |

## Rules

- **DO NOT delete any file listed in 01, 02, or 03.**
- **Files in 04, 05, 06 can be deleted** after the refactors in 07 are done.
- **Files in 07 must be refactored first** or you'll break admin/API.
