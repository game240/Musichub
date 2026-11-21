# Design: Public Legal Pages (Privacy Policy & Terms of Service) and OAuth Compliance

## Overview
To transition Google OAuth from **Testing** to **In Production** and comply with Google OAuth policies and Korean privacy laws (개인정보 보호법), Music Hub requires:
1. A publicly accessible **Privacy Policy** (`/privacy`) that any user or Google verification crawler can access without authentication.
2. A publicly accessible **Terms of Service** (`/terms`) for music streaming and user-uploaded content copyright guidelines.
3. Accessible navigation links in the `LoginPage` and an intuitive way to read and return to login.
4. Transparent contact channels for account deletion and data removal requests.

---

## 1. Requirements

### 1.1 Functional Requirements
- **FR-1**: Direct access via URL paths `/privacy` and `/terms` must render the respective legal document regardless of authentication state (no redirection to login).
- **FR-2**: The `LoginPage` must include links to both `/privacy` and `/terms` in its footer / agreement notices.
- **FR-3**: Users viewing `/privacy` or `/terms` can navigate back to the previous view (or login page) with a "돌아가기 (Back)" button.
- **FR-4**: URL synchronization: Clicking the links on `LoginPage` updates the browser URL to `/privacy` or `/terms` using standard HTML5 History API (`pushState`) without full page reload, and responds to browser back/forward (`popstate`).
- **FR-5**: The Privacy Policy must explicitly cover:
  - Data collected via Google OAuth (`email`, `name`, `sub`/Google ID) and local auth (email, encrypted password, display name).
  - Storage location of uploaded audio files (Cloudflare R2) and purpose (personal playback & tag management).
  - Retention period (until account withdrawal or service termination).
  - Data subject rights and contact information for account deletion / data disposal requests.
- **FR-6**: The Terms of Service must explicitly cover:
  - Personal non-commercial use of uploaded audio.
  - Copyright infringement prohibition (users must hold the rights or license to uploaded music).
  - Disclaimer of liability for user-uploaded content.

### 1.2 Non-Functional Requirements
- **NFR-1**: Lightweight zero-dependency routing: Since the frontend currently does not use `react-router-dom`, path detection and URL changes will be handled via browser pathname (`window.location.pathname`) and `popstate` events, avoiding external router dependencies and bundle bloat.
- **NFR-2**: StyleSeed design compliance: The design will follow the Linear-inspired dark UI palette (`#08090a`, `#0f1011`, border `#ffffff/[0.08]`, text neutral scales, purple accent `#5e6ad2`).
- **NFR-3**: Accessibility & Mobile responsiveness: Clean typography, readable line length (`max-w-3xl`), structured section headers, and responsive margins.

---

## 2. Architecture & Frontend Structure

### 2.1 File Placement
Following the `AGENTS.md` component guidelines:
- Screen folder: `frontend/src/components/pages/legal/`
  - `frontend/src/components/pages/legal/PrivacyPolicyPage.tsx`: Full Korean privacy policy document with structured sections and back navigation.
  - `frontend/src/components/pages/legal/TermsOfServicePage.tsx`: Full Korean terms of service document with structured sections and back navigation.
  - `frontend/src/components/pages/legal/LegalLayout.tsx`: Shared wrapper providing header, back button, date of enforcement, and container styling.

### 2.2 Routing Logic in `App.tsx`
Currently, `AppContent` checks:
```tsx
if (isLoading) return <LoadingSpinner />;
if (!isAuthenticated) return <LoginPage />;
return <LibraryPage />;
```

We introduce a simple path listener:
```tsx
const getLegalRoute = () => {
  const path = window.location.pathname;
  if (path === '/privacy' || path === '/privacy-policy') return 'privacy';
  if (path === '/terms' || path === '/terms-of-service') return 'terms';
  return null;
};
```
If `currentRoute` matches `'privacy'` or `'terms'`, the legal view is displayed immediately before the `!isAuthenticated` check. This guarantees public access for crawlers and unauthenticated visitors.

When navigating from `LoginPage`:
- Clicking "개인정보처리방침" or "이용약관" calls `window.history.pushState({}, '', '/privacy')` and updates state to render the page seamlessly.
- Clicking "로그인으로 돌아가기" calls `window.history.pushState({}, '', '/')` or `window.history.back()`.

---

## 3. Account Deletion (회원 탈퇴) Status & Future Scope

### 3.1 Current Status
- Currently, Music Hub has:
  - `UserIdentityController`: Unlink Google account (only allowed if local password exists).
  - `AuthController`: Logout (invalidates refresh token).
- **Full account deletion (`DELETE /api/users/me`) is NOT yet implemented.**

### 3.2 Google OAuth Requirement vs. In-App Deletion
- For Google OAuth verification (specifically non-sensitive scopes like OIDC), an automated in-app deletion button is **not strictly required** to publish the app to production.
- Google requires that **clear instructions and a contact channel (e.g. email)** are provided in the Privacy Policy so that users can request deletion of their data and revocation of access.
- **Phase 1 (Immediate - This Spec)**: Complete Privacy Policy, Terms of Service, and Public Routing to satisfy Google OAuth Consent Screen requirements.
- **Phase 2 (Next Step)**: Implement complete account deletion feature (`DELETE /api/users/me` deleting database records + R2 audio files) in a separate dedicated feature plan.

---

## 4. Verification Plan
1. **Direct URL Test**:
   - Navigate directly to `http://localhost:5173/privacy` and `http://localhost:5173/terms` in an unauthenticated browser / incognito tab $\rightarrow$ Verify document displays properly without redirect.
2. **LoginPage Navigation Test**:
   - From `LoginPage`, click "개인정보처리방침" $\rightarrow$ URL changes to `/privacy`, document renders.
   - Click "돌아가기" $\rightarrow$ Returns to `LoginPage`, URL reverts.
3. **Responsive & Typography Verification**:
   - Check mobile/desktop layout, dark theme contrast, and readability.
4. **Google Console Submission**:
   - Once deployed, paste `https://<domain>/privacy` and `https://<domain>/terms` into Google Cloud Console OAuth Consent Screen.
