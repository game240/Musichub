# Design: Spring Security 401 Unauthorized Entry Point

- **Date:** 2026-11-22
- **Status:** Approved
- **Target Components:** Backend (`SecurityConfig.kt`)

---

## 1. Problem Statement

When an access token expires (validity 15 minutes), subsequent requests to authenticated endpoints (`/api/music-files/*/play`, `/api/music-files/*/artwork`, `/api/users/me/playback`, `/api/music-files`) return **403 Forbidden** instead of **401 Unauthorized**.

Because the frontend API client (`client.ts`) response interceptor only intercepts **401** status codes to trigger silent token refresh (`/api/auth/refresh`) and retry original requests, receiving 403 halts all communication, resulting in playback errors and broken UI state.

---

## 2. Requirements

- **FR-1**: When an unauthenticated or expired token request hits any protected endpoint (`anyRequest().authenticated()`), the backend must return HTTP **401 Unauthorized** instead of 403 Forbidden.
- **FR-2**: Existing public endpoints (`/api/auth/**`, `/error`) must continue to be accessible without authentication.
- **FR-3**: No frontend changes required, as `client.ts` already correctly handles 401 by silently refreshing the token and retrying pending requests.

---

## 3. Technical Design

### 3.1 Exception Handling Configuration in `SecurityConfig.kt`
Configure `http.exceptionHandling`:
```kotlin
http
    .exceptionHandling { handling ->
        handling.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
    }
```
Using Spring Security's `HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)` ensures any `AuthenticationException` or missing authentication automatically responds with HTTP 401 without redirecting to a login page or falling back to default 403.

---

## 4. Verification

1. Request protected endpoints without an `Authorization` header -> verify response status is `401 Unauthorized`.
2. Request protected endpoints with an expired token -> verify response status is `401 Unauthorized`.
3. Frontend silent token refresh kicks in automatically upon receiving 401, re-authenticates via refresh token cookie, and retries the request seamlessly.
