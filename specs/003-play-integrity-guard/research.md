# Research: Play Integrity Guard

**Feature Branch**: `003-play-integrity-guard`  
**Date**: February 13, 2026  
**Status**: Complete

## Research Tasks & Findings

### R1: Play Integrity API Architecture — Can Tokens Be Decoded Client-Side?

**Context**: The spec assumes "no backend verification component—all verification happens client-side." Need to verify technical feasibility.

**Decision**: Tokens CANNOT be decoded client-side. A thin backend decryption endpoint is required.

**Rationale**: Google's Play Integrity API returns an **encrypted** token on the client. Decryption is only possible via Google's server-side API (`playintegrity.googleapis.com/v1/PACKAGE_NAME:decodeIntegrityToken`) using a GCP service account. This is an intentional security measure — Google does not expose decryption to on-device code.

**Impact on Spec**: The plan adds a minimal backend endpoint (`POST /api/integrity/verify`) to the existing NestJS server. This endpoint is a thin pass-through: receives the encrypted token, calls Google's API to decrypt, returns the verdict. **Enforcement remains client-side** — the backend does not gate any other API calls. This preserves the spec's intent (client-side enforcement, minimal infrastructure cost) while being technically correct.

**Alternatives Considered**:

- `PackageManager.getInstallerPackageName()`: Truly client-side, checks if installer was `com.android.vending` (Play Store). Rejected: easily spoofable with 1-line Xposed hook; no signature or device integrity check.
- Firebase Cloud Function for token decryption: Rejected — adds an external dependency when we already have a NestJS backend.

---

### R2: React Native Play Integrity Library Selection

**Context**: Need an Expo-compatible library to call the Play Integrity native API from React Native.

**Decision**: Use `react-native-google-play-integrity` (npm package by kedros-as/rrrasti).

**Rationale**: This is the most established React Native wrapper for Google's Play Integrity API. It provides:

- `isPlayIntegrityAvailable()` — checks Play Services availability
- `requestIntegrityToken(nonce)` — requests encrypted integrity token
- Standard Request support (low latency, automatic replay protection)
- Minimum Android API level 21 (Android 5.0+), compatible with our target

It is a native module requiring a custom dev client (not compatible with Expo Go), which aligns with EAS Build.

**Alternatives Considered**:

- `expo-app-integrity`: Expo's module — only supports iOS App Attest, no Android Play Integrity. Rejected.
- Custom native module (Kotlin): Writing our own bridge. Rejected: unnecessary when a maintained wrapper exists.
- `expo-application` `getInstallReferrerAsync()`: Supplementary signal, not a replacement. Could be added as defense-in-depth later.

---

### R3: Verdict Fields Relevant to Anti-Piracy

**Context**: Need to determine which verdict fields to check and what values indicate pass/fail.

**Decision**: Check three verdict fields from the decrypted token: `appIntegrity`, `accountDetails`, `deviceIntegrity`.

**Rationale**: Based on Google's official verdict documentation:

| Field                                      | Key Value                  | What It Proves                                        |
| ------------------------------------------ | -------------------------- | ----------------------------------------------------- |
| `appIntegrity.appRecognitionVerdict`       | `PLAY_RECOGNIZED`          | App binary matches the version uploaded to Play Store |
| `accountDetails.appLicensingVerdict`       | `LICENSED`                 | User installed/purchased app from Google Play         |
| `deviceIntegrity.deviceRecognitionVerdict` | `[MEETS_DEVICE_INTEGRITY]` | Device is genuine, not rooted/emulated                |

**Enforcement logic (backend returns verdict, client decides)**:

- `PLAY_RECOGNIZED` + `LICENSED` + `MEETS_DEVICE_INTEGRITY` → Pass
- `UNRECOGNIZED_VERSION` → Fail (tampered/re-signed APK)
- `UNLICENSED` → Fail (sideloaded, not purchased from Play)
- `UNEVALUATED` on any field → Transient failure, allow retry
- `deviceRecognitionVerdict` empty → Fail (rooted/emulated device)

`MEETS_STRONG_INTEGRITY` is NOT required (spec: rooted devices passing basic integrity are acceptable).

---

### R4: EAS Build Configuration for Custom Dev Client

**Context**: Need to determine how to build the app with native Play Integrity module and deploy to Play Console.

**Decision**: Use EAS Build with three profiles: `development`, `preview`, `production`.

**Rationale**:

- `react-native-google-play-integrity` is a native module — Expo Go can't load it
- Custom dev client is only needed when testing the actual integrity flow
- Daily development continues in Expo Go via `__DEV__` bypass
- Production builds generate AAB for Play Store upload

**Configuration**:

1. Install `expo-dev-client` package
2. Create `eas.json` with build profiles
3. Set `android.package` in `app.json` (e.g., `com.dojoexam.cloudprep`)
4. Build custom dev client: `eas build --profile development --platform android`
5. Production: `eas build --profile production --platform android` (AAB)

**EAS profiles**:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

---

### R5: Google Play Console & GCP Setup for Internal Test Track

**Context**: User requested "a phase for deploying the app in playstore first to test for dev/beta testing." Play Integrity verdicts require Play Console registration.

**Decision**: Dedicated Phase 0 in implementation for Play Console + GCP setup before any code changes.

**Rationale**: Play Integrity verdicts are only valid for apps that:

1. Have a registered package name in Play Console
2. Have been uploaded to at least the internal test track
3. Are linked to a GCP project with Play Integrity API enabled

**Setup sequence**:

1. **Google Play Console** ($25 one-time developer registration)
   - Create app listing for "Dojo Exam" / "CloudPrep"
   - Set `android.package` to `com.dojoexam.cloudprep`
   - Upload initial AAB to internal test track
   - Add tester email(s) to internal test track
2. **Google Cloud Console**
   - Create/reuse GCP project
   - Enable "Play Integrity API"
   - Link Play Console to GCP project
   - Note GCP project number (needed by client library)
   - Create service account with `playintegrity` scope (for backend decryption)
   - Download service account key JSON (stored as env var on backend)
3. **Verification**
   - Install app from internal test track on physical device
   - Confirm integrity token request succeeds
   - Confirm sideloaded APK returns failing verdict

---

### R6: AsyncStorage Sandbox & Cache Behavior

**Context**: Need to select storage for the verification flag and confirm uninstall clears it.

**Decision**: Use `@react-native-async-storage/async-storage` (already a dependency at v2.2.0).

**Rationale**:

- Already in the project, no new dependency
- Android sandboxes app-private storage — inaccessible without root
- Uninstalling the app clears AsyncStorage (Android default)
- Two key-value pairs: `@integrity_verified` (boolean), `@integrity_verified_at` (ISO timestamp)

**Alternatives Considered**:

- `expo-sqlite`: Already used for questions. Rejected: overkill for 2 key-value pairs, couples integrity to question data.
- `expo-secure-store`: Encrypted storage. Rejected: adds dependency; cached boolean isn't sensitive (the token is never stored).

---

### R7: Backend Token Decryption Endpoint Design

**Context**: Since client-side decryption is impossible, we need a minimal backend endpoint.

**Decision**: Add `POST /api/integrity/verify` to the existing NestJS backend.

**Rationale**: The existing NestJS API is already accessible from the mobile app (used for question sync). Adding one endpoint is lowest-friction.

**Endpoint design**:

- **Request**: `POST /api/integrity/verify` with body `{ "token": "<encrypted_integrity_token>" }`
- **Backend logic**:
  1. Call `playintegrity.googleapis.com/v1/com.dojoexam.cloudprep:decodeIntegrityToken`
  2. Authenticate with GCP service account credentials
  3. Return the verdict JSON to the client
- **Response**: The raw verdict payload (client evaluates pass/fail)
- **No enforcement**: Backend does not store, log, or act on the verdict. Pure pass-through.
- **Env var**: `GCP_SERVICE_ACCOUNT_KEY` for the service account credentials

**Security note**: Rate-limiting already exists on the NestJS backend (`RateLimitMiddleware`). The endpoint inherits this protection. The backend trusts the existing infrastructure.

---

### R8: Development Bypass Strategy

**Context**: Must ensure developers can work without Play Store installation.

**Decision**: Use React Native's `__DEV__` global for bypass, with console logging.

**Rationale**:

- `__DEV__` is `true` in development builds, `false` in production — compiled at build time, not runtime-settable
- When `__DEV__` is `true`, the integrity service returns `{ verified: true, reason: 'dev_bypass' }` immediately
- `console.log('[IntegrityGuard] Bypassed — development mode')` is emitted
- Standard React Native pattern for dev-only behavior

**Risk assessment**: An attacker could theoretically distribute a dev build, but `__DEV__` builds include Metro bundler, dev menu, and debug tooling making them unsuitable. `__DEV__` is `false` in all EAS Build profiles except `development` (internal only).
