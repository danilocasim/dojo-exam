# Tasks: Play Integrity Guard

**Input**: Design documents from `/specs/003-play-integrity-guard/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Each user story includes automated tests (unit/integration) and manual E2E validation per spec.md "Independent Test" sections. Manual tests documented in quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **API**: `api/src/`
- **Mobile**: `mobile/src/`, `mobile/`

---

## Phase 1: Setup (Project Configuration) ✅

**Purpose**: EAS Build configuration, dependency installation, project package/plugin setup

**Status**: COMPLETE — All dependencies and configuration already in place

- [x] T001 Create EAS Build configuration with development, preview, and production profiles in `mobile/eas.json`
- [x] T002 [P] Add `android.package` (`com.dojoexam.cloudprep`) and `expo-dev-client` plugin to `mobile/app.json`
- [x] T003 [P] Install mobile dependencies: `react-native-google-play-integrity`, `expo-dev-client` in `mobile/`
- [x] T004 [P] Install API dependencies: `googleapis`, `google-auth-library` in `api/`
- [x] T005 [P] Add Play Integrity environment variables (`GOOGLE_CLOUD_PROJECT_NUMBER`, `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`) to `api/src/config/configuration.ts`

---

## Phase 2: Foundational (Play Console & GCP Setup)

**Purpose**: External service registration that MUST be complete before ANY integrity verification can work

**⚠️ CRITICAL**: No production integrity testing can begin until this phase is complete — Play Integrity API requires a registered app on Play Console and a configured GCP project. US3 (Dev Bypass) can proceed with Phase 1 only.

- [ ] T006 Register app on Google Play Console, create internal test track, and upload initial AAB built with `eas build --platform android --profile production`
- [ ] T007 Enable Play Integrity API in Google Cloud Console, create service account with `playintegrity.verifier` role, and download JSON key file
- [ ] T008 Configure Play Integrity API settings in Play Console (App integrity → Play Integrity API → Link Cloud project)
- [ ] T009 Add service account key file path to API `.env` and verify `configuration.ts` loads it correctly

**Checkpoint**: Play Console app registered, GCP project configured, internal test track ready — integrity API calls are now possible

---

## Phase 3: User Story 3 — Dev Bypass (Priority: P1) 🎯 MVP

**Goal**: In development mode (`__DEV__`), skip Play Integrity entirely so developers can use Expo Go without hitting Google APIs.

**Independent Test**: Run `npx expo start` in Expo Go → app loads normally with no integrity checks → console logs "Play Integrity: dev bypass active"

### Implementation for User Story 3

- [ ] T010 [US3] Create integrity service scaffold with dev bypass in `mobile/src/services/integrity.service.ts` — export `checkIntegrity()` that returns `{ verified: true, reason: 'dev_bypass' }` when `__DEV__` is true, with `console.log` warning
- [ ] T011 [US3] Create `IntegrityCache` type and AsyncStorage key constants (`@integrity_verified`, `@integrity_verified_at`) in `mobile/src/services/integrity.service.ts`
- [ ] T012 [US3] Add integrity gate to `mobile/App.tsx` — call `checkIntegrity()` during init, add `integrityVerified` state, gate app rendering on it; in dev mode this resolves immediately via bypass

### Testing for User Story 3

- [ ] T012.1 [US3] Unit test: `checkIntegrity()` with `__DEV__ = true` returns `{verified: true, reason: 'dev_bypass'}` in `mobile/src/services/__tests__/integrity.service.test.ts`
- [ ] T012.2 [US3] Manual E2E test (documented in quickstart.md): Run `npx expo start` in Expo Go → verify console log "Play Integrity: dev bypass active" appears → app loads normally

**Checkpoint**: Developers can run the app in Expo Go; `__DEV__` bypass is verified via console output. Dev bypass path fully validated via unit + manual E2E test. No Google API calls made.

---

## Phase 4: User Story 1 — Legitimate User Verification (Priority: P1)

**Goal**: On a real device with a Play Store install, the app silently verifies integrity on first launch, caches the result, and never bothers the user again.

**Independent Test**: Install app via internal test track → first launch completes integrity check silently (no UI interruption) → subsequent launches skip verification (cache hit) → app functions normally

### Backend Implementation

- [ ] T013 [P] [US1] Create verify integrity DTO with class-validator decorators in `api/src/integrity/dto/verify-integrity.dto.ts`
- [ ] T014 [P] [US1] Create integrity service that calls Google Play Integrity API (`google.playintegrity('v1').decodeIntegrityToken()`) in `api/src/integrity/integrity.service.ts`
- [ ] T015 [US1] Create integrity controller with `POST /api/integrity/verify` endpoint in `api/src/integrity/integrity.controller.ts`
- [ ] T016 [US1] Create integrity module registering controller and service in `api/src/integrity/integrity.module.ts`
- [ ] T017 [US1] Create barrel export in `api/src/integrity/index.ts`
- [ ] T018 [US1] Register `IntegrityModule` in `api/src/app.module.ts`

### Mobile Implementation

- [ ] T019 [US1] Implement `requestIntegrityToken()` using `react-native-google-play-integrity` in `mobile/src/services/integrity.service.ts` — call `IntegrityTokenRequest` with cloud project number from config
- [ ] T020 [US1] Implement `verifyTokenWithBackend(token)` in `mobile/src/services/integrity.service.ts` — POST to `/api/integrity/verify` using existing axios instance
- [ ] T021 [US1] Implement `evaluateVerdict(verdict)` in `mobile/src/services/integrity.service.ts` — check `appRecognitionVerdict` (PLAY_RECOGNIZED), `appLicensingVerdict` (LICENSED), `deviceRecognitionVerdict` (includes MEETS_DEVICE_INTEGRITY) per data-model.md logic
- [ ] T022 [US1] Implement AsyncStorage cache read/write in `mobile/src/services/integrity.service.ts` — `getCachedVerification()` and `cacheVerification()` using `@integrity_verified` and `@integrity_verified_at` keys
- [ ] T023 [US1] Complete `checkIntegrity()` full flow in `mobile/src/services/integrity.service.ts` — cache check → token request → backend verify → evaluate verdict → cache result → return `VerificationResult`
- [ ] T024 [US1] Update `mobile/App.tsx` to run integrity check concurrently with `initializeDatabase()` and `performFullSync()`, gate on combined result

### Testing for User Story 1

- [ ] T024.1 [US1] Backend integration test: Mock Google API response, call `POST /api/integrity/verify`, verify 200 response with decoded verdict in `api/src/integrity/integrity.controller.spec.ts`
- [ ] T024.2 [US1] Mobile integration test: Mock backend response (PLAY_RECOGNIZED verdict), verify `checkIntegrity()` caches result and returns `{verified: true, reason: 'verified'}` in `mobile/src/services/__tests__/integrity.service.test.ts`
- [ ] T024.3 [US1] Manual E2E test (documented in quickstart.md): Install app via internal test track → first launch completes silently → check AsyncStorage for `@integrity_verified = "true"` → force-stop app → relaunch with airplane mode → verify app loads (cache hit)

**Checkpoint**: App installed from internal test track passes integrity silently. Cache means second launch skips API call. Backend endpoint returns decoded verdict. Legitimate user flow validated via backend integration test, mobile integration test, and manual E2E on internal test track.

---

## Phase 5: User Story 2 — Sideloaded App Blocking (Priority: P1)

**Goal**: If the app is sideloaded (not from Play Store), show a full-screen blocking message with a button linking to the Play Store listing.

**Independent Test**: Build APK with `eas build --profile preview` → `adb install` directly → app shows blocking screen with "Get from Play Store" button → tapping button opens Play Store listing

### Implementation for User Story 2

- [ ] T025 [P] [US2] Create `IntegrityBlockScreen` component in `mobile/src/components/IntegrityBlockScreen.tsx` — full-screen overlay with warning icon, "This app must be installed from Google Play Store" message, "Get from Play Store" button using `Linking.openURL('https://play.google.com/store/apps/details?id=com.dojoexam.cloudprep')` with `Linking.canOpenURL()` check (fallback: display "Search for CloudPrep on Google Play Store" text if URL cannot be opened), and app version display
- [ ] T026 [US2] Update `mobile/App.tsx` to render `IntegrityBlockScreen` when `integrityVerified` is false and not in dev mode — replace app content entirely (no navigation, no exam access)
- [ ] T027 [US2] Handle edge cases in `mobile/src/services/integrity.service.ts` — return specific failure reasons: `'unrecognized_app'`, `'unlicensed'`, `'device_integrity_fail'`, `'network_error'`, `'google_api_error'` so `IntegrityBlockScreen` can show appropriate messaging
- [ ] T028 [US2] Add retry capability to `IntegrityBlockScreen` — implement three UI states:
  1. **Transient failures** (FR-016: network error, FR-017: API unavailable/UNEVALUATED) → Show appropriate message with "Retry" button that re-runs `checkIntegrity()`
  2. **Definitive failures** (FR-018: UNLICENSED, UNRECOGNIZED_VERSION, device integrity fail) → Show blocking message with "Get from Play Store" button, NO retry option
  3. **Retry logic**: Button calls `checkIntegrity()` again, updates `integrityVerified` state in `App.tsx` on success, shows loading indicator during retry

### Testing for User Story 2

- [ ] T028.1 [US2] Mobile integration test: Mock backend verdict return UNLICENSED, verify `IntegrityBlockScreen` renders with "Get from Play Store" button in `mobile/src/components/__tests__/IntegrityBlockScreen.test.tsx`
- [ ] T028.2 [US2] Manual E2E test (documented in quickstart.md): Build APK with `eas build --profile preview` → `adb install` on physical device → launch app → verify blocking screen displays → tap "Get from Play Store" → verify Play Store opens to app listing

**Checkpoint**: Sideloaded installs see blocking screen. Play Store installs pass through. Retry works for transient errors. Sideload blocking validated via unit test + manual E2E with sideloaded APK.

---

## Phase 6: User Story 4 — Reinstall Re-verification (Priority: P2)

**Goal**: When a user uninstalls and reinstalls the app, integrity verification runs again from scratch (AsyncStorage clears automatically on Android uninstall).

**Independent Test**: Install from internal track → verify integrity passes → uninstall app → reinstall from internal track → verify integrity check runs again (not cached) → app works normally

### Implementation for User Story 4

- [ ] T029 [US4] Verify AsyncStorage clears on uninstall by documenting Android behavior in code comments in `mobile/src/services/integrity.service.ts` — confirm no additional code needed since Android clears app data on uninstall
- [ ] T030 [US4] Add cache TTL check in `getCachedVerification()` in `mobile/src/services/integrity.service.ts` — if `@integrity_verified_at` is older than 30 days, invalidate cache and re-verify (configurable TTL constant)
- [ ] T031 [US4] Export `clearIntegrityCache()` utility in `mobile/src/services/integrity.service.ts` for potential future use (settings screen, force re-verify)

### Testing for User Story 4

- [ ] T031.1 [US4] Mobile unit test: Mock `AsyncStorage.getItem` return verification older than 30 days, verify `getCachedVerification()` invalidates cache in `mobile/src/services/__tests__/integrity.service.test.ts`
- [ ] T031.2 [US4] Manual E2E test (documented in quickstart.md): Install from internal track → verify integrity passes → uninstall → reinstall → verify integrity check runs again (not cached, fresh token request observed in logs)

**Checkpoint**: Uninstall/reinstall triggers fresh verification. Cache TTL prevents indefinite caching. Manual cache clear available. Cache TTL and reinstall behavior validated via unit test + manual E2E.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling hardening, logging, and validation across all stories

- [ ] T032 [P] Add structured error handling in `mobile/src/services/integrity.service.ts` — try/catch around token request, backend call, and verdict evaluation with specific error types per FR-013/FR-014
- [ ] T033 [P] Add request timeout (10s) and retry logic (1 retry with backoff) for backend call in `mobile/src/services/integrity.service.ts`
- [ ] T034 [P] Add rate limiting guard to `api/src/integrity/integrity.controller.ts` using NestJS `@Throttle()` decorator
- [ ] T035 [P] Add input validation and error responses (400, 502) to `api/src/integrity/integrity.controller.ts` per contracts/integrity-api.yaml
- [ ] T036 [P] Add logging to `api/src/integrity/integrity.service.ts` — log verdict results (without PII/tokens) for monitoring
- [ ] T037 Update `mobile/src/services/index.ts` barrel export to include integrity service
- [ ] T038 Run quickstart.md end-to-end validation: dev bypass test, internal track test, sideload block test, reinstall test
- [ ] T039 Measure cold-start times: first-launch with network (target ≤5s per SC-003), subsequent launch with cached verification (target ≤3s per SC-004) — test on a mid-range Android device

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all production integrity testing
- **US3 Dev Bypass (Phase 3)**: Depends on Phase 1 only (no Play Console needed) — can start immediately after Setup
- **US1 Legitimate User (Phase 4)**: Depends on Phase 2 (needs Play Console + GCP) AND Phase 3 (builds on service scaffold)
- **US2 Sideloaded Block (Phase 5)**: Depends on Phase 4 (needs working verification to distinguish pass/fail)
- **US4 Reinstall (Phase 6)**: Depends on Phase 4 (needs working cache mechanism)
- **Polish (Phase 7)**: Depends on Phases 3–6

### User Story Dependencies

- **US3 (Dev Bypass)**: Independent — needs only Phase 1 Setup. Can be implemented and tested in Expo Go with zero external dependencies.
- **US1 (Legitimate User)**: Needs US3 scaffold + Phase 2 (Play Console, GCP). Backend and mobile can be developed in parallel once Phase 2 is complete.
- **US2 (Sideloaded Block)**: Needs US1 working — the blocking UI only triggers when verification fails, so US1's verification flow must work first.
- **US4 (Reinstall)**: Needs US1 working — cache behavior must be implemented before testing re-verification. Can be done in parallel with US2.

### Within Each User Story

- Models/DTOs before services
- Services before controllers/endpoints
- Backend before mobile integration (for US1)
- Core implementation before integration with App.tsx
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T002, T003, T004, T005 can all run in parallel
- **Phase 3**: Can start immediately after Phase 1 (no Phase 2 dependency)
- **Phase 4**: T013 and T014 can run in parallel (DTO + service are independent files)
- **Phase 5**: T025 can start in parallel with Phase 4 backend work (component is independent)
- **Phase 6**: US4 (T029–T031) can run in parallel with US2 (T025–T028)
- **Phase 7**: T032, T033, T034, T035, T036 can all run in parallel (different files/concerns)

---

## Parallel Example: User Story 1

```text
# After Phase 2 completes, launch backend tasks together:
Task T013: "Create verify integrity DTO in api/src/integrity/dto/verify-integrity.dto.ts"
Task T014: "Create integrity service in api/src/integrity/integrity.service.ts"

# After T013+T014, sequential backend:
Task T015 → T016 → T017 → T018

# After backend ready, sequential mobile:
Task T019 → T020 → T021 → T022 → T023 → T024
```

## Parallel Example: US2 + US4 (after US1 complete)

```text
# These two stories can run in parallel:
Stream A (US2): T025 → T026 → T027 → T028
Stream B (US4): T029 → T030 → T031
```

---

## Implementation Strategy

### MVP First (US3 Dev Bypass Only)

1. Complete Phase 1: Setup (EAS config, deps, env vars)
2. Complete Phase 3: US3 Dev Bypass
3. **STOP and VALIDATE**: Run in Expo Go, verify bypass works
4. This unblocks developers immediately — no Play Console needed

### Incremental Delivery

1. **Increment 0**: Setup + US3 Dev Bypass → Developers unblocked
2. **Increment 1**: Foundational (Play Console + GCP) → External services ready
3. **Increment 2**: US1 Legitimate User → Silent verification working on internal track
4. **Increment 3**: US2 Sideloaded Block + US4 Reinstall (parallel) → Full protection
5. **Increment 4**: Polish → Production-ready error handling and logging

### Critical Path

```
Phase 1 → Phase 2 → Phase 4 (US1) → Phase 5 (US2) → Phase 7
                                   ↘ Phase 6 (US4) ↗
Phase 1 → Phase 3 (US3) — can proceed independently
```

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] labels map tasks to user stories from spec.md
- Phase 2 (Foundational) involves manual Play Console + GCP setup — not automatable
- US3 (Dev Bypass) is deliberately placed first as it unblocks all development work
- Backend endpoint is stateless pass-through — no Prisma schema changes needed
- AsyncStorage clears automatically on Android uninstall (OS behavior, not app code)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
