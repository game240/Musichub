# Global Tag Sync Widget Implementation Plan

Mount `FloatingTagSyncWidget` at the root `App` component level to render across all routes.

- [x] Cut feature branch `feat/global-tag-sync-widget` from `dev`
- [x] Move `<FloatingTagSyncWidget />` in `frontend/src/App.tsx` to `<App />` root level
- [x] Run `pnpm -C frontend lint` and `pnpm -C frontend build` to verify
- [x] Merge feature branch into `dev` with `--no-ff`
