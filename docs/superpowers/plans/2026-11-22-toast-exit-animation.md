# Implementation Plan: Toast Exit Animation

- **Date:** 2026-11-22
- **Spec:** [docs/superpowers/specs/2026-11-22-toast-exit-animation-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-22-toast-exit-animation-design.md)
- **Status:** In Progress
- **Target Components:**
  - `frontend/src/stores/toastStore.ts`
  - `frontend/src/components/molecules/Toast.tsx`
  - `frontend/src/components/organisms/ToastContainer.tsx`

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - `AGENTS.md`: "feat/* - feature branches cut from dev, merged back with --no-ff".
   - Commit format: `type: subject` (e.g. `feat: add exit animation to toast notifications`).
2. **Scope**:
   - Add `isExiting` to `ToastItem`.
   - Implement `dismissToast` with 200ms delay before removal.
   - Update `Toast.tsx` with exit classes (`opacity-0 -translate-y-2.5 scale-95`).
   - Update `ToastContainer.tsx` to bind `dismissToast`.
   - Verify frontend build and lint.

---

## 2. Step-by-Step Milestones

### Milestone 1: Store & Component Updates
- [ ] Add `isExiting?: boolean` to `ToastItem` in `toastStore.ts`.
- [ ] Add `dismissToast` in `useToastStore` and route auto-dismiss timer through `dismissToast`.
- [ ] In `Toast.tsx`, conditionally apply exit classes when `isExiting` is true.
- [ ] In `ToastContainer.tsx`, pass `dismissToast` instead of immediate `removeToast`.

### Milestone 2: Verification & Git Merge
- [ ] Run `pnpm run build` in `frontend/`.
- [ ] Run `pnpm run lint` in `frontend/`.
- [ ] Commit on `feat/toast-exit-animation` and merge to `dev` with `--no-ff`.
