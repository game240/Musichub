# Design: Toast Exit Animation

- **Date:** 2026-11-22
- **Status:** Approved
- **Target Components:**
  - `frontend/src/stores/toastStore.ts`
  - `frontend/src/components/molecules/Toast.tsx`
  - `frontend/src/components/organisms/ToastContainer.tsx`

---

## 1. Problem Statement

Currently, when a toast notification times out (after 3000ms) or is closed by the user, it is immediately unmounted from the React component tree without any exit transition.
This causes a sudden visual pop that clashes with the smooth entrance animation (`animate-in fade-in slide-in-from-top-2`) and the Linear design aesthetics of MusicHub.

---

## 2. Requirements

- **FR-1 (Graceful Exit Animation)**: When a toast is dismissed (either by timer expiration or manual close button click), it must smoothly animate out before being unmounted.
- **FR-2 (Visual Transition)**: The exit transition must smoothly fade out (`opacity-0`), slide upwards towards the top (`-translate-y-2.5`), and scale down slightly (`scale-95`) over 200ms (`transition-all duration-200 ease-out`).
- **FR-3 (State Coordination)**: `toastStore` must track an `isExiting?: boolean` flag on `ToastItem` and provide a `dismissToast(id: string)` method that triggers the exit state and waits 200ms before removing the item from state.
- **FR-4 (No Interaction During Exit)**: While exiting, clicks or touches on the toast must be ignored (`pointer-events-none`).
- **FR-5 (Rapid Dismiss Protection)**: Repeated calls to `dismissToast` on an already-exiting toast must not re-trigger timers.

---

## 3. Technical Design

### 3.1 Store Updates (`toastStore.ts`)

```typescript
export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
  isExiting?: boolean;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, durationMs?: number) => string;
  dismissToast: (id: string) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}
```

In `dismissToast(id)`:
```typescript
dismissToast: (id) => {
  const existing = get().toasts.find((t) => t.id === id);
  if (!existing || existing.isExiting) return;

  set((state) => ({
    toasts: state.toasts.map((t) => (t.id === id ? { ...t, isExiting: true } : t)),
  }));

  setTimeout(() => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  }, 200);
}
```

In `addToast`:
```typescript
if (durationMs > 0) {
  setTimeout(() => {
    get().dismissToast(id);
  }, durationMs);
}
```

### 3.2 Component Updates (`Toast.tsx` & `ToastContainer.tsx`)

In `Toast.tsx`:
```tsx
const isExiting = toast.isExiting;

<div
  role="status"
  aria-live="polite"
  className={cn(
    'pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl',
    'bg-[#18191b]/95 border border-white/10 text-neutral-100 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
    'backdrop-blur-xl text-xs sm:text-sm font-medium break-keep select-none max-w-sm sm:max-w-md w-full',
    'transition-all duration-200 ease-out',
    isExiting
      ? 'opacity-0 -translate-y-2.5 scale-95 pointer-events-none'
      : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-top-2',
  )}
>
```

In `ToastContainer.tsx`:
Pass `dismissToast` as the `onClose` callback to `Toast`.

---

## 4. Verification Plan

1. **Frontend Build**: Run `pnpm run build` to verify type safety and build output.
2. **Frontend Lint**: Run `pnpm run lint` to confirm zero ESLint issues.
3. **Behavioral Check**:
   - Trigger a toast -> verify smooth slide down and fade in.
   - Wait 3 seconds -> verify smooth slide up, scale down, and fade out over 200ms before disappearing.
   - Click 'X' close button -> verify immediate smooth exit animation.
