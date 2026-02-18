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

## Uploading to Google Play Store

### Prerequisites for Upload

- [ ] Google Play Console project created (app package: `com.awsccp.exampre`)
- [ ] App signed with release signing key
- [ ] Version code incremented (each upload must have higher version code)
- [ ] Build tested thoroughly (all scenarios 1-4 above)
- [ ] Google Play Console service account (for automated uploads)

### Step 1: Build Release APK/AAB

**Option A: Using Automated Build Script** (Recommended)

```bash
cd mobile
./build-release.sh
```

This script:
1. Validates prerequisites (Node, Gradle, Android SDK)
2. Cleans previous builds
3. Runs `expo prebuild` to generate native Android files
4. Builds the release APK via `./gradlew assembleRelease`
5. Validates the output and shows location

**Option B: Build Android App Bundle (AAB)** (Preferred by Google)

```bash
cd mobile
npx expo prebuild -p android --clean
cd android
./gradlew bundleRelease
cd ../..
```

Outputs: `mobile/android/app/build/outputs/bundle/release/app-release.aab`

**Option C: Manual APK Build**

```bash
cd mobile
npx expo prebuild -p android --clean
cd android
./gradlew assembleRelease
cd ../..
```

Outputs: `mobile/android/app/build/outputs/apk/release/app-release.apk`

### Step 2: Verify Build Integrity

```bash
# Check file exists and size
ls -lh mobile/android/app/build/outputs/apk/release/app-release.apk

# Verify signing certificate (if APK)
cd mobile/android
./gradlew signingReport

# Output should show:
# Variant: release
# Config: release
# Store: /path/to/keystore
# Alias: android-release-key
# MD5: (hash)
# SHA1: (hash)
# SHA-256: (hash)
```

### Step 3: Upload via Google Play Console (Manual)

**For First Release:**

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app: **AWS CloudPractitioner Exam Prep**
3. Navigate to **Testing** > **Internal Testing**
4. Click **Create new release**
5. Click **Upload APK** or **Upload AAB**
6. Select your build file (`app-release.apk` or `app-release.aab`)
7. Review details:
   - Version name: `1.0.0` (or increment: `1.0.1`)
   - Version code: Must be higher than previous release
   - Release notes: Document Play Integrity Guard changes
8. Click **Review** then **Start rollout to internal testing**

**For Subsequent Releases:**

1. Navigate to **Testing** > **Internal Testing**
2. Click **Create new release**
3. Upload new AAB/APK with **incremented version code**
4. Review and start rollout

### Step 4: Testing Phases

**Phase 1: Internal Testing** (T206-T208)

```
Track: Internal Testing
Testers: 5-10 (your team)
Duration: 3-5 days
Criteria:
  ✅ App installs from Play Store
  ✅ Integrity check passes (verified=true)
  ✅ No blocking screen on first launch
  ✅ Can complete exam offline
  ✅ Cloud sync works (if enabled)
```

**Phase 2: Closed Testing** (T209-T210)

```
Track: Closed Testing
Testers: 30-50 (beta testers, friends, colleagues)
Duration: 1 week
Criteria:
  ✅ Same as Phase 1
  ✅ Gather feedback on UI/UX
  ✅ Monitor crash reports
  ✅ Test on real devices (multiple Android versions)
```

**Phase 3: Beta Testing** (T211-T212)

```
Track: Beta / Open Testing
Testers: Unlimited (public)
Duration: 1-2 weeks
Criteria:
  ✅ Same as Phase 2
  ✅ Monitor 1-star reviews for critical issues
```

**Phase 4: Production Release** (T213+)

```
Track: Production
Rollout: Staged (10% → 25% → 50% → 100%)
Timeline:
  Day 1: 10% rollout (monitor crashes)
  Day 3: 25% rollout
  Day 5: 50% rollout
  Day 7: 100% rollout (full release)

Post-launch Checklist:
  ✅ Monitor crash rate (target: <1%)
  ✅ Monitor reviews
  ✅ Ready to rollback if critical issues found
```

### Step 5: Automated Upload via GitHub Actions (Optional)

**Setup Service Account:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new service account or use existing
3. Grant role: **Service Account User** + **Editor**
4. Download JSON credentials file
5. Add to GitHub Secrets:
   ```
   PLAY_STORE_SERVICE_ACCOUNT = <contents of JSON file, base64 encoded>
   PLAY_STORE_APP_PACKAGE = com.awsccp.exampre
   PLAY_STORE_TRACK = internal  # or closed, beta, production
   ```

**Create GitHub Actions Workflow:**

Create `.github/workflows/build-and-upload.yml`:

```yaml
name: Build and Upload to Play Store

on:
  push:
    tags:
      - 'v*'  # Trigger on version tags (v1.0.0, v1.0.1, etc.)

jobs:
  build-and-upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: ./mobile
        run: npm ci
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
      
      - name: Prebuild Android
        working-directory: ./mobile
        run: npx expo prebuild -p android --clean
      
      - name: Build release APK
        working-directory: ./mobile/android
        run: ./gradlew bundleRelease
      
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
          packageName: com.awsccp.exampre
          releaseFiles: mobile/android/app/build/outputs/bundle/release/app-release.aab
          track: ${{ secrets.PLAY_STORE_TRACK }}
          inAppUpdatePriority: 3
```

**Trigger Workflow:**

```bash
# Tag a release
git tag -a v1.0.0 -m "Play Integrity Guard release"
git push origin v1.0.0

# GitHub Actions will automatically build and upload to Play Store
```

**Monitor Upload:**

- Go to **Actions** tab in GitHub
- Watch workflow progress
- Play Console will show new release in selected track

### Step 6: Troubleshooting Upload Issues

**Error: "Could not validate APK signature"**

- Solution: Verify signing key is correct
- Check: `./gradlew signingReport`
- Ensure: Same keystore used for all releases

**Error: "Version code X already exists"**

- Solution: Increment version code in `app.json`
- Current: `versionCode: 1` → Change to `versionCode: 2`
- Run build again

**Error: "Invalid package name"**

- Ensure: Package name matches Play Console entry
- Current: `com.awsccp.exampre`
- Check: `android/app/src/AndroidManifest.xml` or `app.json`

**Error: "Target API level too low"**

- Current target: API 36
- Google Play minimum: API 35 (as of Feb 2025)
- Update if needed: `android/build.gradle`

**Upload Hangs or Times Out**

- File size > 100MB: Consider splitting with Play Console's modular features
- Solution: Switch to AAB format (smaller than APK)
- Command: `./gradlew bundleRelease` (not `assembleRelease`)

**General Troubleshooting Checklist:**

- [ ] APK/AAB file exists: `ls -lh mobile/android/app/build/outputs/**/app-release.*`
- [ ] Version code incremented in `app.json` or `build.gradle`
- [ ] Signing certificate matches previous releases
- [ ] Network connectivity stable during upload
- [ ] Play Console project permissions granted for your account
- [ ] Service account has "Release Manager" role (for automated uploads)

### Rollback Procedure

If critical issues found post-release:

**Immediate Rollback (within 2 hours):**

```
Play Console > Select Release > Click "..." > Halt Rollout
```

**Hotfix Release:**

1. Fix issue in code
2. Increment version code
3. Rebuild: `cd mobile && ./build-release.sh`
4. Upload to **internal testing** first (validation)
5. If successful, release to production with staged rollout

**Emergency: Disable App**

```
Play Console > Store settings > Remove from Play Store
Users retain access; new installs blocked
```

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
