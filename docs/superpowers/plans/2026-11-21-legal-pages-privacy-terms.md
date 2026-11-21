# Legal Pages (Privacy Policy & Terms of Service) Implementation Plan

- **Date:** 2026-11-21
- **Spec:** [docs/superpowers/specs/2026-11-21-legal-pages-privacy-terms-design.md](file:///c:/vscode/Musichub/docs/superpowers/specs/2026-11-21-legal-pages-privacy-terms-design.md)
- **Status:** Completed

---

## 1. Execution Strategy & Rules

1. **Rule Compliance**:
   - `AGENTS.md`: "Design approved before implementation; plan written before touching code".
   - Git branch: `feat/legal-pages` cut from `dev`.
   - Commit format: `type: subject` (e.g. `feat: add public privacy policy and terms of service pages`).
2. **Frontend Component Architecture**:
   - Domain screen folder: `frontend/src/components/pages/legal/`
   - Shared layout: `LegalLayout.tsx`
   - Privacy page: `PrivacyPolicyPage.tsx`
   - Terms page: `TermsOfServicePage.tsx`
   - Zero-dependency routing in `App.tsx` using `window.location.pathname` and `popstate`.
   - Notice and footer links in `LoginPage.tsx`.

---

## 2. Step-by-Step Milestones

### Milestone 1: Git Branch Preparation
- [x] Create and checkout feature branch `feat/legal-pages` from `dev`.

### Milestone 2: Legal Pages Components
- [x] Create `frontend/src/components/pages/legal/LegalLayout.tsx`
  - Top bar with Music Hub logo/branding, "돌아가기(Back)" button, and dark theme palette.
  - Responsive content container with clean typography and date of enforcement.
- [x] Create `frontend/src/components/pages/legal/PrivacyPolicyPage.tsx`
  - Full Korean Privacy Policy compliant with Google OAuth policies and Korean Personal Information Protection Act.
  - Sections: Collected items (Google OIDC + Local auth), purpose, retention period, third-party storage (Cloudflare R2), user rights & deletion/withdrawal request channel, security measures, contact info.
- [x] Create `frontend/src/components/pages/legal/TermsOfServicePage.tsx`
  - Full Korean Terms of Service covering music file upload, personal copyright responsibility, prohibited actions, service availability, disclaimer of warranties.

### Milestone 3: Public Routing Integration
- [x] Update `frontend/src/App.tsx`
  - Add state/effect listening to `window.location.pathname` and `popstate` events.
  - Route `/privacy` / `/privacy-policy` to `PrivacyPolicyPage`.
  - Route `/terms` / `/terms-of-service` to `TermsOfServicePage`.
  - Ensure public rendering before `!isAuthenticated` gate.

### Milestone 4: LoginPage Links & Footer
- [x] Update `frontend/src/components/pages/auth/LoginPage.tsx`
  - Add agreement text above Google login button or under register/login submit.
  - Add footer with copyright and clickable links (`이용약관`, `개인정보처리방침`).
  - Wire up navigation via `window.history.pushState` and custom event or callback.

### Milestone 5: Verification & Merge
- [x] Run `npm run build` in `frontend` to verify TypeScript and Vite build.
- [x] Run `npm run lint` or `npm run format:check` to ensure code style compliance.
- [ ] Commit all changes on `feat/legal-pages` with `type: subject`.
- [ ] Merge `feat/legal-pages` into `dev` with `--no-ff`.
