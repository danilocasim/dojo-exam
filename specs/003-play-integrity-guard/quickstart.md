# Quickstart: Play Integrity Guard

**Feature Branch**: `003-play-integrity-guard`  
**Date**: February 13, 2026

## Prerequisites

- Existing CloudPrep Mobile project (002-cloudprep-mobile complete)
- Google Play Developer Console account ($25 one-time registration)
- Google Cloud Console account (free tier sufficient)
- Physical Android device for testing (emulators may not return full verdicts)
- EAS CLI: `npm install -g eas-cli`

## Phase 0: Play Console & GCP Setup

### 1. Register on Google Play Console

```bash
# Open Google Play Console
# https://play.google.com/console
#
# 1. Create new app → "Dojo Exam" (or "CloudPrep")
# 2. Set app category, content rating, etc. (required for internal testing)
# 3. Note the package name — must match android.package in app.json
```

### 2. Set Android Package Name

Update `mobile/app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.dojoexam.cloudprep"
    }
  }
}
```

### 3. Configure EAS Build

```bash
cd mobile

# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Initialize EAS in the project
eas build:configure
```

Create `mobile/eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### 4. Build & Upload Initial AAB to Internal Test Track

```bash
# Build production AAB
eas build --profile production --platform android

# Download the .aab file from the EAS build URL
# Upload to Google Play Console → Internal testing track
# Add your tester email(s) to the internal test track
# Wait for processing (~30 min for first upload)
```

### 5. Setup Google Cloud Project

```bash
# Open Google Cloud Console
# https://console.cloud.google.com
#
# 1. Create new project (or reuse existing) → "cloudprep-integrity"
# 2. Enable "Play Integrity API" in API Library
# 3. Link Google Play Console to this GCP project:
#    - Play Console → Setup → API access → Link to GCP project
# 4. Note the GCP project NUMBER (not name) — needed by client library
# 5. Create service account:
#    - IAM → Service Accounts → Create
#    - Name: "integrity-verifier"
#    - Role: "Service Account User"
#    - Create JSON key → download
# 6. Store key as environment variable on backend
```

### 6. Configure Backend Environment

```bash
cd api

# Add to .env.local
echo 'GCP_PROJECT_NUMBER=<your-gcp-project-number>' >> .env.local
echo 'ANDROID_PACKAGE_NAME=com.dojoexam.cloudprep' >> .env.local

# Store service account key (base64 encoded for env var)
cat path/to/service-account-key.json | base64 | tr -d '\n' > /tmp/key64.txt
echo "GCP_SERVICE_ACCOUNT_KEY=$(cat /tmp/key64.txt)" >> .env.local
rm /tmp/key64.txt
```

## Phase 1: Install Dependencies

### Mobile App

```bash
cd mobile

# Install Play Integrity native library
npm install react-native-google-play-integrity

# Install dev client for native module support
npx expo install expo-dev-client

# Add expo-dev-client plugin to app.json plugins array
# "plugins": ["expo-sqlite", "expo-dev-client"]
```

### Backend API

```bash
cd api

# Install Google Auth Library for GCP API calls
npm install googleapis google-auth-library
```

## Phase 2: Implement Backend Endpoint

Create `api/src/integrity/` module:

```bash
mkdir -p api/src/integrity
```

Key files to create:

- `api/src/integrity/integrity.module.ts` — NestJS module
- `api/src/integrity/integrity.controller.ts` — POST /api/integrity/verify
- `api/src/integrity/integrity.service.ts` — Google API decryption logic
- `api/src/integrity/dto/verify-integrity.dto.ts` — Request validation

Register in `api/src/app.module.ts`:

```typescript
import { IntegrityModule } from './integrity/integrity.module';

@Module({
  imports: [
    // ... existing imports
    IntegrityModule,
  ],
})
```

## Phase 3: Implement Mobile Integrity Service

Create `mobile/src/services/integrity.service.ts`:

Key functions:

- `checkIntegrity()` — Main entry point called from App.tsx
- `getCachedStatus()` — Read AsyncStorage cache
- `requestAndVerify()` — Request token → send to backend → evaluate verdict
- `evaluateVerdict()` — Parse verdict → return pass/fail

## Phase 4: Integrate into App Entry Point

Modify `mobile/App.tsx` to add integrity gate:

```typescript
// Pseudocode for App.tsx changes
const [integrityStatus, setIntegrityStatus] = useState<
  'checking' | 'passed' | 'failed' | 'error'
>('checking');

useEffect(() => {
  const initialize = async () => {
    // Run integrity check and database init concurrently
    const [integrityResult] = await Promise.all([
      checkIntegrity(),
      initializeDatabase(),
    ]);

    if (!integrityResult.passed) {
      setIntegrityStatus('failed');
      return; // Short-circuit — don't proceed with sync/navigation
    }

    setIntegrityStatus('passed');
    // ... continue with existing sync logic
  };
  initialize();
}, []);
```

## Phase 5: Build Blocking UI Component

Create `mobile/src/components/IntegrityBlockScreen.tsx`:

- Full-screen dark background with warning icon
- Message: "For security reasons, this app must be downloaded from Google Play."
- Button: "Open Google Play" → `Linking.openURL('market://details?id=com.dojoexam.cloudprep')`
- Retry button for transient errors (network/API unavailable)

## Verification Steps

### Test 1: Development Mode Bypass

```bash
cd mobile
npx expo start
# Launch on emulator → app should load normally
# Console should show: [IntegrityGuard] Bypassed — development mode
```

### Test 2: Internal Test Track (Happy Path)

```bash
# Build production AAB
eas build --profile production --platform android

# Upload to internal test track
# Install from Play Store internal test link
# Launch → should pass integrity check → app loads normally
```

### Test 3: Sideloaded APK (Block Path)

```bash
# Build preview APK
eas build --profile preview --platform android

# Install via adb
adb install path/to/app.apk

# Launch → should show blocking screen
```

### Test 4: Offline After Verification

```bash
# After Test 2 succeeds, enable airplane mode
# Kill and reopen app
# Should load normally (cached verification)
```
