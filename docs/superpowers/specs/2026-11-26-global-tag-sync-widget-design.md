# Global Tag Sync Widget Design

## 1. Overview
Currently, `FloatingTagSyncWidget` is mounted only within the library layout of `AppContent` in `frontend/src/App.tsx`.
When navigating to the YouTube extraction screen (`ExtractionPage`) or admin screen (`AdminUsersPage`), `AppContent` early-returns those page components without mounting `FloatingTagSyncWidget`.
Although metadata modifications from the YouTube extraction page trigger tag synchronization via `tagSyncStore`, the status widget does not appear on screen because it is not mounted.

This design moves `FloatingTagSyncWidget` to the root `App` component level (inside `TooltipProvider`), allowing the synchronization status widget to be persistently displayed across all routes whenever synchronization tasks exist.

---

## 2. Goals & Non-Goals
### Goals
- Mount `FloatingTagSyncWidget` globally inside `App.tsx` so it appears on all pages (including `/extractions`, `/admin/users`, and `/`).
- Ensure persistent display of tag synchronization progress even across page navigations without unmounting/remounting flicker.
- Keep `FloatingTagSyncWidget` hidden when there are no active/completed tasks (`tasks.length === 0`).

### Non-Goals
- Altering the UI design or styling of `FloatingTagSyncWidget`.
- Changing the behavior or API of `tagSyncStore`.

---

## 3. Architecture & Changes

### 3.1 `frontend/src/App.tsx`
- Remove `<FloatingTagSyncWidget />` from `AppContent`'s return statement.
- Place `<FloatingTagSyncWidget />` inside the root `App` component as a sibling to `<AppContent />` within `<TooltipProvider>`:
```tsx
export const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          <AppContent />
          <FloatingTagSyncWidget />
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};
```

---

## 4. Verification Plan
1. **Static Analysis & Build**:
   - `pnpm -C frontend lint`
   - `pnpm -C frontend build`
2. **Behavioral Verification**:
   - Verify that when no tasks are present, nothing is rendered.
   - Verify that when metadata is edited in YouTube extraction screen or library screen, the sync notification appears regardless of current route.
