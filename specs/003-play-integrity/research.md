# Research: Play Integrity Guard

**Feature**: 003-play-integrity  
**Date**: February 15, 2026  
**Status**: Complete

## Research Tasks

### 1. Play Integrity API Integration Library

**Context**: App must verify installation via Google's Play Integrity API without adding native module complexity to Expo managed workflow.

**Decision**: Use `@react-native-google-signin/google-signin` (existing integration from Phase 2) with Play Integrity verify endpoint, OR use custom native module bridge if library unavailable; defer to `expo-play-integrity` if available.

**Rationale**:

- `@react-native-google-signin/google-signin`: Already integrated in Phase 2 (Google Sign-In). Can extend to request Play Integrity token via same Google API surface.
- Expo managed workflow maintained; no additional native module setup beyond existing.
- Token generation happens on client; decryption happens server-side (stateless).
- Avoids adding React Native Firebase or Google Play Services wrapper—we only need token request and verification.

**Alternatives Considered**:

- `react-native-device-integrity`: Too broad; includes root detection beyond Play Integrity.
- Manual JNI bridge: Overkill complexity; Play Integrity available via existing Google libraries.
- WatermelonDB integrity module: Doesn't exist; would require custom native code.

### 2. Local Integrity Status Storage

**Context**: App must cache verification result locally with 30-day TTL, survive app restarts, and clear on uninstall (Android default behavior).

**Decision**: Store `IntegrityStatus` table in existing SQLite database (expo-sqlite) using same Drizzle/raw SQL patterns as questions cache.

**Rationale**:

- SQLite already integrated for questions, exam attempts, practice sessions (Phase 2).
- Structured persistence for `integrity_verified` (boolean) and `verified_at` (ISO timestamp).
- Automatic cleanup on uninstall (Android sandboxed storage behavior).
- Matches existing mobile storage architecture; no AsyncStorage dependency needed.
- Query: `SELECT * FROM IntegrityStatus LIMIT 1` on app init to decide verification path.

**Alternatives Considered**:

- AsyncStorage: No TTL support; would require manual expiry logic.
- Device.native storage: Overkill; SQLite sufficient and already integrated.
- App state persistence: Lost on process kill; unreliable for first-launch verification.

### 3. Verification Flow Architecture

**Context**: Integrity check must run concurrent with Database/Questions init without blocking UI initialization screen or adding noticeable delay.

**Decision**: Parallel initialization tasks in App.tsx: database setup and integrity check run concurrently; app render waits for both to complete before showing RootNavigator.

**Rationale**:

- Current App.tsx: `initializeDatabase()` blocks until questions table exists and sync completes.
- Add: `checkIntegrity()` as sibling Promise in `Promise.all()` to run in parallel.
- IntegrityCheck logic: If `verified` flag exists and `verified_at` < 30 days → skip API call. If missing or stale → request token → server verify → store result.
- If verification fails decisively → set `integrityBlocked = true` → render `<IntegrityBlockedScreen />` instead of `<RootNavigator />`.
- **No added latency** if cache hit. **+1–2 sec max** on first launch (API timeout/retry included).

**Alternatives Considered**:

- Background verification: Would require permission check and background task framework; complicates error recovery.
- Splash screen modal: Could work but less clean UX; user sees app briefly then blocked.
- Deferred verification: Defeats purpose; allows pirated users to use app before verify failure.

### 4. Error Handling & Retry Strategy

**Context**: Network failures, transient API errors, and device edge cases must be recoverable without permanent blocking.

**Decision**: Distinguish transient (retry-able) vs. definitive (block) failures. Transient: UNEVALUATED verdict, timeout, network timeout, 5xx. Definitive: UNLICENSED, UNRECOGNIZED_VERSION, device integrity fail.

**Rationale**:

- Transient failures: Let user proceed with cached result if available; show "Retry" button if cache expired.
- Definitive failures: Block app permanently; no retry option; only workaround is fresh install from Play Store.
- Matches Play Integrity API verdict semantics: UNLICENSED is intentional (user didn't buy); UNEVALUATED is temporary.
- Exception: First launch, no cache, transient failure → show retry button; user can recover by connecting to internet.

**Alternatives Considered**:

- Retry all failures: Risks giving pirated users access if API recovers.
- No distinction: Either blocks everything (UX harm) or allows everything (security harm).

### 5. Development Mode Bypass Mechanism

**Context**: Developers must bypass integrity check locally (Expo, debug builds) without custom build variants or environment configs.

**Decision**: Check `__DEV__` global at entry point (App.tsx). If true, set `integrityBlocked = false` and skip all API calls. Log message to console.

**Rationale**:

- `__DEV__` is reliable React Native global; true in Expo development, false in release builds.
- No additional config needed; automatically handled by Metro bundler.
- Release builds from Google Play have `__DEV__ = false` due to production bundle optimization.
- matches existing patterns in codebase (auth-service.ts, token-refresh-service.ts use `__DEV__` checks).

**Alternatives Considered**:

- Environment variable: Requires .env setup per developer; fragile.
- Magic server check: Adds offline dependency; complicates cold-start.
- Build variant: Requires separate dev/prod Gradle configurations; breaks Expo managed workflow.

### 6. Backend Integrity Verification Endpoint

**Context**: Mobile client requests Play Integrity token decryption via backend stateless proxy. Backend must NOT block API access based on verdict—only decrypt.

**Decision**: Create `POST /api/integrity/verify` endpoint that accepts Play Integrity token (encrypted), calls Google's `PlayIntegrity.decrypt()`, returns decrypted verdict. Client enforces blocking.

**Rationale**:

- Play Integrity tokens are encrypted; only Google's API and your app's signing key can decrypt.
- Backend acts as stateless proxy; no database writes, no user state changes.
- Client remains authoritative on whether to block. Backend simply decrypts.
- Keeps security logic on the client where it can be tested and reset on reinstall.
- Matches No-enforcement assumption from spec.

**Alternatives Considered**:

- Backend enforcement: Complicates user management; requires storing integrity verdicts in User table.
- Direct client-to-Google: Requires embedding API key on device; vulnerable to extraction.
- No backend endpoint at all: Token encrypted; client cannot decrypt without server.

## Summary: Technology Stack for 003

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Mobile Library** | @react-native-google-signin/google-signin extension (or expo-play-integrity) | Already integrated; extends existing Google auth surface |
| **Mobile Storage** | SQLite (expo-sqlite) | Existing pattern; structured persistence with TTL support |
| **Mobile Init** | Parallel Promise.all() in App.tsx | Non-blocking; leverages existing architecture |
| **Mobile UI** | New IntegrityBlockedScreen component | Simple blocking-only UI; no navigation access |
| **Backend Endpoint** | NestJS POST /api/integrity/verify | Stateless proxy; minimal code; no business logic |
| **Verdict Handling** | Client-side enforcement | Security on device; survives reinstall via cache clear |
| **Error Recovery** | Transient vs. definitive distinction | User-friendly retry UX without security compromise |
| **Testing** | Jest (mobile), Supertest (API), Detox (E2E) | Existing test suite; new tests follow same patterns |

---

## Open Questions Resolved

1. **Q: Will integrity check add noticeable launch delay?**  
   A: No. With cached verification (common case), check is <10ms SQLite query. First launch: +1–2sec for API call, which overlaps database initialization, resulting in minimal user-perceived latency.

2. **Q: What about devices without Google Play Services?**  
   A: Integrity check will fail (as expected per spec). Blocking screen shown. These devices cannot install from Play Store anyway, so this is acceptable.

3. **Q: Can user bypass by copying app data?**  
   A: Android sandboxes app-private storage; cannot be copied without root access. For rooted devices, Play Integrity device integrity check will catch most. Accepted risk per spec assumptions.

4. **Q: Where is API key stored for backend verification?**  
   A: Google Play Console service account credential stored in backend environment. Spec assumes this is already configured; 003 does not add credential storage guidance (Out of Scope).

5. **Q: Do we need to modify Prisma schema for Play Integrity?**  
   A: No. Play Integrity data is device-specific, not shared/synced. Stored in mobile local SQLite only. Backend does not persist verdicts. No Prisma changes needed.
