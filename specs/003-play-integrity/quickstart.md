# Quickstart: Play Integrity Guard Development

**Feature**: 003-play-integrity  
**Date**: February 15, 2026  
**Status**: Development Guide

## Overview

This guide helps developers set up and test Play Integrity Guard locally during development.

## Prerequisites

- Branch: `003-play-integrity` (created from merged 002-cloudprep-mobile)
- Node.js 18+, npm 9+
- Android SDK / Emulator (for mobile testing)
- Expo CLI installed: `npm install -g expo-cli`
- Google Play Console project (for production; dev uses bypass)

## Local Development Setup

### 1. Environment Configuration

**No new environment variables required for development**. The `__DEV__` check in React Native automatically bypasses integrity verification in Expo dev builds.

For backend testing (optional):

```bash
# api/.env (if using staging/test credentials)
GOOGLE_PLAY_CONSOLE_CREDENTIALS_JSON=<base64-encoded service account JSON>
PLAY_INTEGRITY_API_KEY=<from Google Cloud Console>
```

Production: Credentials stored in deployment environment (not in repo).

### 2. Mobile Development

#### Running the App in Dev Mode

```bash
cd mobile
npm install  # Install dependencies (if needed)
npx expo start
# Select: i (iOS) or a (Android)
```

**Integrity Check Status**: 
- ✅ Automatically bypassed (`__DEV__ == true`)
- ✅ Console log shows: `[PlayIntegrity] Bypassed in development mode`
- ✅ No Play Store install required
- ✅ Full app access granted

### 3. Backend Setup

#### Start Backend API

```bash
cd api
npm install  # If needed
npm run start:dev
```

**Endpoint Available**: `POST http://localhost:3000/api/integrity/verify`

#### Test Integrity Endpoint (Mock)

```bash
# Terminal: POST request to backend
curl -X POST http://localhost:3000/api/integrity/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "mock-token-for-testing"}'

# Expected Response (dev/test):
# {
#   "success": false,
#   "error": "Mock/test token. Real tokens require google-auth-library."
# }
```

## Testing Scenarios

### Scenario 1: First Launch (Development Mode)

**Goal**: Verify app launches without integrity blocking in dev mode.

```bash
# Terminal 1: Run backend
cd api && npm run start:dev

# Terminal 2: Run mobile
cd mobile && npx expo start
# Select: a (Android emulator)
```

**Expected Behavior**:
1. Emulator launches app
2. Initialization screen shows (database setup, questions sync)
3. No blocking screen appears
4. Console output shows: `[PlayIntegrity] Bypassed in development mode`
5. App navigates to HomeScreen normally

**Success Criteria**: ✅ App fully accessible without integrity prompt

---

### Scenario 2: Integrity Blocked Screen (Simulated)

**Goal**: Test blocking UI without releasing to Play Store.

**Manual Test** (modify code temporarily):

```typescript
// mobile/src/services/play-integrity.service.ts
// Temporarily change bypass logic for testing:

export async function checkIntegrity(): Promise<IntegrityCheckResult> {
  // TEMPORARY: Force block for testing
  if (true) { // Override __DEV__ check
    return {
      verified: false,
      error: {
        type: 'DEFINITIVE',
        message: 'For security reasons, this app must be downloaded from Google Play.',
      },
    };
  }
  // ... rest of implementation
}
```

Run app:

```bash
npx expo start
# Select: a
```

**Expected Behavior**:
1. App initializes
2. Blocking screen appears with message: "For security reasons, this app must be downloaded from Google Play."
3. Button: "Open Google Play" (taps should open Play Store or show message)
4. No navigation available; user cannot dismiss screen

**Success Criteria**: ✅ Blocking screen displays, prevents app access

**Cleanup**: Revert the temporary change before committing.

---

### Scenario 3: Offline After Verification

**Goal**: Verify app works offline after initial verification.

**Steps**:

1. **Enable Network** (first launch):
   ```bash
   npx expo start
   # Select: a
   ```
   App launches with integrity check (bypassed in dev, but would verify in production)

2. **Enable Airplane Mode** (on device/emulator):
   - Go to Settings → Airplane Mode → ON
   - Or use Android Emulator: Extended controls → Network → Airplane mode ON

3. **Restart App** (force close + relaunch):
   ```bash
   # In Android Emulator:
   # - Close app (back button or swipe)
   # - Relaunch via home screen
   ```

**Expected Behavior**:
1. App relaunch in airplane mode
2. Database loads from local cache (no network needed)
3. Questions accessible offline
4. Exam simulation works normally

**Success Criteria**: ✅ App fully functional offline (no integrity-related network calls)

---

### Scenario 4: 30-Day Cache TTL Expiry (Simulated)

**Goal**: Verify re-verification triggers after 30 days.

**Mock Test** (unit test):

```typescript
// mobile/__tests__/play-integrity.service.test.ts
describe('IntegrityStatus TTL', () => {
  it('should re-verify if cache older than 30 days', async () => {
    // Create fake cache with verified_at = 31 days ago
    const oldVerifiedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    
    // Mock database
    const mockStatus = { integrity_verified: true, verified_at: oldVerifiedAt };
    
    // Call integrity check
    const result = await checkIntegrity();
    
    // Should trigger fresh verification (would call API in production)
    expect(result.needsReVerification).toBe(true);
  });
});
```

Run test:

```bash
cd mobile
npm test -- play-integrity.service.test.ts
```

**Success Criteria**: ✅ Test passes; logic correctly identifies stale cache

---

## Production Testing (Release Build)

### Pre-Release Checklist

- [ ] APK built with release signing key (Google Play signature)
- [ ] Installed on Android device (not via adb sideload)
- [ ] Installed via Google Play internal test track or beta track
- [ ] Device has internet connection
- [ ] Google Play Services available on device
- [ ] Google Play Console service account credentials configured in backend

### Testing Steps

1. **First Launch**:
   ```bash
   # On device: Uninstall app
   # On Play Console: Release to internal test track
   # On device: Install from Play Store (or test track)
   # Expected: App verifies, displays no blocking screen, loads normally
   ```

2. **Sideload Test** (verify blocking works):
   ```bash
   # Build release APK
   cd android && ./gradlew assembleRelease
   
   # Sideload to device (NOT Play Store)
   adb install -r app/release/app-release.apk
   
   # Launch app on device
   # Expected: Blocking screen appears immediately
   ```

3. **Offline Test**:
   ```bash
   # On device: Enable Airplane Mode
   # Close app + relaunch
   # Expected: App loads from cache, works normally
   ```

### Rollback

If blocking happens unexpectedly:

1. **Backend rollback**: Remove `/api/integrity/verify` endpoint (non-breaking change)
2. **Mobile rollback**: Push hotfix that returns `verified=true` from `checkIntegrity()`
3. **User recovery**: User can uninstall and reinstall from Play Store

---

## Debugging

### Console Logs

Mobile app will log integrity checks:

```
[PlayIntegrity] Bypassed in development mode
[PlayIntegrity] Checking cached integrity status...
[PlayIntegrity] Cache hit: verified=true, age=5 days
[PlayIntegrity] Verification passed
[PlayIntegrity] Starting verification request...
[PlayIntegrity] Verification failed: TRANSIENT (UNEVALUATED)
[PlayIntegrity] Showing retry screen
```

### Backend Logs

API endpoint logs:

```
[IntegrityController] POST /api/integrity/verify received
[IntegrityService] Decrypting token...
[IntegrityService] Google API response: {appRecognitionVerdict: 'PLAY_RECOGNIZED', ...}
[IntegrityController] Verdict returned: success=true
```

### SQLite Inspection (Mobile)

On device/emulator:

```bash
# Via Expo CLI, if using expo-sqlite-explorer (optional):
# Check local database state
# SELECT * FROM IntegrityStatus;
```

Via Android Studio:

```
Device Explorer → data/data/com.example.exam/files/SQLite → [db file]
```

---

## Common Issues

### Issue: Development Mode Still Blocks App

**Symptoms**: Blocking screen appears even with `__DEV__ == true`

**Solution**:
1. Verify `__DEV__` is true: Add log to App.tsx
2. Check Expo build: `npx expo start --clear`
3. Fallback: Re-enable network and test bypass server-side

---

### Issue: Integrity Endpoint Returns 404

**Symptoms**: Mobile requests `/api/integrity/verify`, backend returns 404

**Solution**:
1. Verify backend running: `curl http://localhost:3000/health`
2. Check IntegrityModule imported in app.module.ts
3. Check NestJS route prefix (if any) doesn't interfere

---

### Issue: Sideload Install Fails

**Symptoms**: `adb install` returns error

**Solution**:
```bash
# Ensure device/emulator connected
adb devices

# Use -r flag to replace existing
adb install -r path/to/app-release.apk

# Check permissions in AndroidManifest.xml (if modified)
```

---

## Performance Baseline

During early testing, measure & document:

| Metric | Before 003 | After 003 | Delta |
|--------|-----------|----------|-------|
| First-launch time | ~3s | <5s | <+2s acceptable |
| Cached-launch time | ~3s | ~3s | 0s (no regression) |

Use Detox profiler:

```bash
npm run test:e2e -- --record-logs all
# Check output for [IntegrityCheck] timing
```

---

## Next Steps

1. **Local Development**: Run through Scenarios 1–3 above
2. **Unit Testing**: Add tests in `mobile/__tests__/play-integrity.service.test.ts`
3. **E2E Testing**: Run full integration with backend API
4. **Pre-Release**: Complete checklist above before production release

For detailed implementation, see: [plan.md](plan.md)

---

## Support

- **Specification**: [spec.md](spec.md)
- **Research**: [research.md](research.md)
- **Data Model**: [data-model.md](data-model.md)
- **Implementation Plan**: [plan.md](plan.md)
- **GitHub Issue**: Track as T151–T180 in tasks.md (when generated)
