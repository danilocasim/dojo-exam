# Data Model: Play Integrity Guard

**Feature Branch**: `003-play-integrity-guard`  
**Date**: February 13, 2026  
**Storage**: AsyncStorage (mobile), N/A (backend is pass-through only)

## Overview

This feature introduces two conceptual entities. Neither modifies the existing PostgreSQL database — the backend acts purely as a token decryption proxy.

1. **Mobile Local Storage (AsyncStorage)**: Cached verification status
2. **In-Memory (mobile)**: Integrity verdict from Google API (never persisted)

---

## Mobile Local Storage (AsyncStorage)

### IntegrityStatus

Persisted key-value pairs in `@react-native-async-storage/async-storage`.

```
┌────────────────────────────────────────────────────────────┐
│                   AsyncStorage Keys                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Key: @integrity_verified                                  │
│  Type: string ("true" | absent)                            │
│  Description: Whether the app has passed integrity check.  │
│  Cleared on: App uninstall (Android default)               │
│                                                            │
│  Key: @integrity_verified_at                               │
│  Type: string (ISO 8601 timestamp)                         │
│  Description: When the integrity check passed.             │
│  Cleared on: App uninstall (Android default)               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Storage notes**:

- AsyncStorage stores strings only; boolean stored as `"true"` (presence = verified, absence = not verified)
- Both keys are set atomically on verification success via `AsyncStorage.multiSet()`
- Read on every cold start via `AsyncStorage.getItem('@integrity_verified')`
- Never written again after initial success (one-time check)

### TypeScript Interface

```typescript
// mobile/src/services/integrity.service.ts

interface IntegrityCache {
  /** Whether integrity verification passed */
  verified: boolean;
  /** ISO timestamp of when verification passed, null if not verified */
  verifiedAt: string | null;
}

const STORAGE_KEYS = {
  INTEGRITY_VERIFIED: '@integrity_verified',
  INTEGRITY_VERIFIED_AT: '@integrity_verified_at',
} as const;
```

---

## In-Memory: IntegrityVerdict (from Google API)

The raw verdict returned by Google's Play Integrity API after backend decryption. This is evaluated in-memory and **never persisted**.

### Verdict Structure (from Google)

```typescript
// Response from POST /api/integrity/verify
// This is what Google returns after decoding the token

interface PlayIntegrityVerdict {
  requestDetails: {
    requestPackageName: string;
    timestampMillis: string;
    nonce?: string; // Classic requests
    requestHash?: string; // Standard requests
  };
  appIntegrity: {
    appRecognitionVerdict:
      | 'PLAY_RECOGNIZED'
      | 'UNRECOGNIZED_VERSION'
      | 'UNEVALUATED';
    packageName?: string;
    certificateSha256Digest?: string[];
    versionCode?: string;
  };
  deviceIntegrity: {
    deviceRecognitionVerdict?: Array<
      | 'MEETS_DEVICE_INTEGRITY'
      | 'MEETS_BASIC_INTEGRITY'
      | 'MEETS_STRONG_INTEGRITY'
    >;
  };
  accountDetails: {
    appLicensingVerdict: 'LICENSED' | 'UNLICENSED' | 'UNEVALUATED';
  };
}
```

### Verification Logic

```typescript
// mobile/src/services/integrity.service.ts

interface VerificationResult {
  passed: boolean;
  reason:
    | 'verified'
    | 'dev_bypass'
    | 'cached'
    | 'unlicensed'
    | 'unrecognized'
    | 'device_failed'
    | 'unevaluated'
    | 'network_error'
    | 'api_error';
}

function evaluateVerdict(verdict: PlayIntegrityVerdict): VerificationResult {
  const { appIntegrity, accountDetails, deviceIntegrity } = verdict;

  // Check app integrity
  if (appIntegrity.appRecognitionVerdict === 'UNRECOGNIZED_VERSION') {
    return { passed: false, reason: 'unrecognized' };
  }

  // Check licensing (app installed from Play Store)
  if (accountDetails.appLicensingVerdict === 'UNLICENSED') {
    return { passed: false, reason: 'unlicensed' };
  }

  // Check device integrity
  const deviceLabels = deviceIntegrity.deviceRecognitionVerdict ?? [];
  if (!deviceLabels.includes('MEETS_DEVICE_INTEGRITY')) {
    return { passed: false, reason: 'device_failed' };
  }

  // Check for unevaluated (transient — allow retry)
  if (
    appIntegrity.appRecognitionVerdict === 'UNEVALUATED' ||
    accountDetails.appLicensingVerdict === 'UNEVALUATED'
  ) {
    return { passed: false, reason: 'unevaluated' };
  }

  // All checks passed
  return { passed: true, reason: 'verified' };
}
```

### State Transitions

```
┌─────────────────┐
│   App Launch     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     Yes    ┌──────────────────┐
│  __DEV__ mode?  │ ──────────▶│  Return: cached  │
└────────┬────────┘            │  (dev_bypass)    │
         │ No                  └──────────────────┘
         ▼
┌─────────────────┐     Yes    ┌──────────────────┐
│ @integrity_     │ ──────────▶│  Return: cached  │
│ verified?       │            │  Skip check      │
└────────┬────────┘            └──────────────────┘
         │ No (first launch)
         ▼
┌─────────────────┐
│ Request token   │
│ (Play Integrity │
│  native API)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send token to   │
│ backend for     │
│ decryption      │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Success │ Failure (network/API)
    ▼         ▼
┌─────────┐  ┌──────────────────┐
│Evaluate │  │ Show retry msg   │
│ verdict │  │ (network_error / │
└────┬────┘  │  api_error)      │
     │       └──────────────────┘
  ┌──┴──┐
  │Pass │ Fail
  ▼     ▼
┌────┐ ┌──────────────────┐
│Save│ │ Show blocking    │
│flag│ │ screen           │
│    │ │ (unlicensed /    │
│    │ │  unrecognized /  │
│    │ │  device_failed)  │
└────┘ └──────────────────┘
```

---

## Backend: No Persistent Data

The `POST /api/integrity/verify` endpoint is stateless and stores nothing:

- No new database tables or Prisma models
- No new columns on existing tables
- The endpoint receives an encrypted token, calls Google's API, returns the result
- Request/response pass through the existing NestJS rate-limiting middleware

---

## Relationship to Existing Data Model

This feature is **fully additive** — zero changes to the 002-cloudprep-mobile data model:

| Layer                 | Existing                                          | Added by This Feature                           |
| --------------------- | ------------------------------------------------- | ----------------------------------------------- |
| PostgreSQL (Prisma)   | ExamType, Question, Admin, SyncVersion            | Nothing                                         |
| SQLite (mobile)       | questions, exam_attempts, practice_sessions, etc. | Nothing                                         |
| AsyncStorage (mobile) | (various app settings)                            | `@integrity_verified`, `@integrity_verified_at` |
| NestJS API            | ExamTypes, Questions, Admin endpoints             | `POST /api/integrity/verify` (stateless)        |
