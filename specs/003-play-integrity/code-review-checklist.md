# Code Review Checklist: Play Integrity Guard (T190)

**Feature**: 003-play-integrity  
**Date**: February 18, 2026  
**Status**: Pre-merge verification

---

## Pre-Merge Code Review Checklist

Use this checklist to verify all code changes before merging to main/production branches.

### Build & Compilation

- [ ] **TypeScript strict mode**: `cd mobile && npx tsc --noEmit` passes with 0 errors
- [ ] **ESLint**: `npm run lint` shows 0 errors (warnings acceptable if documented)
- [ ] **Mobile builds**: `cd mobile && npm run build` succeeds (or `eas build --local` for full build)
- [ ] **API builds**: `cd api && npm run build` succeeds

### Tests

- [ ] **All unit tests passing**: `npm test -- --coverage` shows 54/54 tests passing (mobile + API)
- [ ] **All E2E tests passing**: `npm run test:e2e` shows 16/16 Detox tests passing
- [ ] **No test warnings**: Test output contains no deprecation warnings or flaky test marks
- [ ] **Performance targets met**: 
  - [ ] First launch with API: < 5000ms ✅
  - [ ] Cached launch: < 3000ms ✅
  - [ ] Cache hit query: < 10ms ✅
- [ ] **Coverage metrics acceptable**: 
  - [ ] play-integrity.service.ts: >95% coverage
  - [ ] integrity.repository.ts: >90% coverage
  - [ ] integrity.controller.ts: >85% coverage

### Mobile Code Review

#### Console Logging

- [ ] **No debug logs in production code**: 
  - [ ] `console.log()` only in dev-time utilities, tests, or gated by `__DEV__`
  - [ ] Search: `grep -r "console\.log\|console\.warn\|console\.error" src/services/play-integrity.service.ts`
  - [ ] Allowed: `[PlayIntegrity]` prefixed logs gated by conditional checks
  - [ ] All removed or wrapped: `if (__DEV__) { console.log(...) }`
  
- [ ] **No sensitive data in logs**: 
  - [ ] No integrity tokens logged
  - [ ] No Google Play API keys/credentials logged
  - [ ] No JWT tokens logged
  - [ ] No user IDs or PII logged

#### Credentials & Secrets

- [ ] **No hardcoded credentials**:
  - [ ] Search: `GOOGLE_PLAY\|API_KEY\|SECRET\|PASSWORD\|TOKEN` in `mobile/src/`
  - [ ] No base64-encoded credentials in code
  - [ ] No .env files committed (check .gitignore)
  - [ ] No service account JSON in code or assets
  
- [ ] **No test credentials in production code**:
  - [ ] Test tokens only in `__tests__/` directory
  - [ ] Mock API responses only in jest.mock() calls
  - [ ] No hardcoded "mock-token" strings in app code

#### Integrity Check Implementation

- [ ] **Bypass logic correct**:
  - [ ] `__DEV__` check at line 69 of play-integrity.service.ts returns `{ verified: true, cachedResult: true }`
  - [ ] Dev bypass only affects development builds (Expo dev client)
  - [ ] Release builds set `__DEV__ = false` (verified in build config)
  - [ ] Bypass message logged: `[PlayIntegrity] Bypassed in development mode`

- [ ] **Error handling covers all cases**:
  - [ ] NETWORK error: offline + no cache → returns `{ verified: false, error: { type: 'NETWORK' } }`
  - [ ] TRANSIENT error: API fails, network available → returns `{ verified: false, error: { type: 'TRANSIENT' } }`
  - [ ] DEFINITIVE error: sideload (UNLICENSED), rooted (UNKNOWN), unrecognized version → blocks app
  - [ ] UNEVALUATED verdict: unhandled verdict types → returns TRANSIENT error (safe default)
  - [ ] Token request fails → returns TRANSIENT error (retry on next launch)
  - [ ] Network timeout → returns NETWORK or TRANSIENT depending on cache availability

- [ ] **Cache logic correct**:
  - [ ] Cache hit: verified_at < 30 days → returns cached result immediately
  - [ ] Cache miss: no record or verified_at > 30 days → calls API
  - [ ] TTL calculation: `getCacheTTL()` returns seconds remaining (0 if expired)
  - [ ] Timestamp format: ISO 8601 strings, UTC timezone
  - [ ] Edge cases: malformed timestamps treated as cache miss

- [ ] **Verdict validation matches spec**:
  - [ ] PLAY_RECOGNIZED + LICENSED + (MEETS_DEVICE_INTEGRITY OR MEETS_STRONG_INTEGRITY) → verified=true
  - [ ] Any other combination → verified=false
  - [ ] Sideload verdict check: appLicensingVerdict === 'UNLICENSED' → definitive block
  - [ ] Rooted device check: deviceRecognitionVerdict === 'UNKNOWN' → definitive block
  - [ ] Version check: appRecognitionVerdict === 'UNRECOGNIZED_VERSION' → definitive block

#### API Communication

- [ ] **Endpoint URL correct**:
  - [ ] Dev: `http://localhost:3000/api/integrity/verify`
  - [ ] Production: environment-based (from api.config.ts)
  - [ ] No hardcoded URLs except localhost for dev
  
- [ ] **Request format correct**:
  - [ ] POST request with `Content-Type: application/json`
  - [ ] Body: `{ token: string }`
  - [ ] Authorization header: JWT token (if required by backend)
  
- [ ] **Response handling**:
  - [ ] Success: expects `{ success: true, verdict: {...} }`
  - [ ] Error: expects `{ success: false, error: string }`
  - [ ] Graceful fallback if response structure unexpected
  - [ ] Network timeout handled (no hanging requests)

#### UI/UX

- [ ] **Blocking screen implemented correctly**:
  - [ ] Appears when `checkIntegrity()` returns `verified=false` with type= 'DEFINITIVE'
  - [ ] Message: "For security reasons, this app must be downloaded from Google Play."
  - [ ] Button: "Get from Google Play" (or similar)
  - [ ] No navigation possible; cannot dismiss without action
  - [ ] Styled consistently with app theme (review with design)
  
- [ ] **No blocking in dev mode**:
  - [ ] Blocking screen never appears when `__DEV__ = true`
  - [ ] Test: run app in dev mode, should never see blocking screen

### Backend Code Review

#### Endpoint Implementation

- [ ] **POST /api/integrity/verify implemented**:
  - [ ] Route registered in integrity.controller.ts
  - [ ] IntegrityModule imported in app.module.ts
  - [ ] Accepts JSON: `{ token: string }`
  - [ ] Returns: `{ success: true, verdict: {...} }` or `{ success: false, error: string }`

- [ ] **Token verification logic**:
  - [ ] Calls Google Play Console API to decrypt token
  - [ ] Extracts verdict fields correctly
  - [ ] Error handling if decryption fails
  - [ ] Timeout on API calls (never hangs)

- [ ] **Error responses**:
  - [ ] 400: Invalid token format → `{ success: false, error: 'Invalid token format' }`
  - [ ] 401: Unauthorized (if auth required) → proper HTTP status
  - [ ] 500: Backend error → generic error message (never expose internal details)
  - [ ] No stack traces in production error responses

#### Security

- [ ] **Credentials protected**:
  - [ ] Google Play Console credentials in environment variables only
  - [ ] Never logged or exposed in error messages
  - [ ] Accessed via config service (not hardcoded)
  - [ ] Use AWS Secrets Manager in production
  
- [ ] **API stateless**:
  - [ ] Endpoint does NOT store verification results in database
  - [ ] Endpoint does NOT modify user data
  - [ ] Each call is independent (no side effects)
  - [ ] No user session changes based on verdict
  
- [ ] **Input validation**:
  - [ ] Token validated before API call
  - [ ] Request size limits applied (no buffer overflows)
  - [ ] Rate limiting considered (if needed for production)

#### Testing

- [ ] **E2E tests for endpoint**:
  - [ ] test/integrity.e2e-spec.ts covers success case
  - [ ] test/integrity.e2e-spec.ts covers error cases
  - [ ] Mock Google API responses (no real API calls in tests)
  - [ ] All tests passing

### Error Messages Specification Compliance

- [ ] **Error messages match spec.md**:
  - [ ] NETWORK error message: "Please connect to the internet for first-time verification." ✅
  - [ ] TRANSIENT error message: "Unable to verify integrity. Please try again." ✅
  - [ ] DEFINITIVE error message: "For security reasons, this app must be downloaded from Google Play." ✅
  - [ ] All messages are user-friendly (no tech jargon)
  - [ ] No API error details exposed in messages

### Documentation

- [ ] **Code comments added**:
  - [ ] Complex logic explained (30-day TTL, cache validation, verdict rules)
  - [ ] Magic numbers documented (30 days, hardcoded strings)
  - [ ] Function exported with JSDoc: `/**  * @param {...} * @returns {...} */`
  
- [ ] **README updated** (if applicable):
  - [ ] Feature documented in api/README.md or mobile/README.md
  - [ ] Links to spec.md, quickstart.md, data-model.md
  
- [ ] **Quickstart tested**:
  - [ ] Follow quickstart.md steps, app launches as expected
  - [ ] All test commands in quickstart run without errors
  - [ ] No broken links in quickstart

### Git & Files

- [ ] **Files modified are correct**:
  - [ ] No unrelated changes (drift from PR scope)
  - [ ] Files match task description paths
  - [ ] No accidental deletions
  
- [ ] **Commit messages clear**:
  - [ ] Format: `[Feature] Brief description (T### Task ID)`
  - [ ] Example: `[Feature] Play Integrity Guard unit tests (T181)`
  
- [ ] **Branch is clean**:
  - [ ] No merge conflicts
  - [ ] All commits rebased or squashed appropriately
  - [ ] Branch up to date with main/002-cloudprep-mobile

### Final Sign-Off

#### Code Quality

- [ ] Architecture reviewed:
  - [ ] Follows existing patterns (ExamAttemptService, AuthService)
  - [ ] Consistent with React Native + Expo + NestJS stack
  - [ ] No unnecessary complexity
  - [ ] Testable (dependencies can be mocked)

- [ ] Performance reviewed:
  - [ ] No N+1 database queries (N/A for stateless backend)
  - [ ] Mobile: first launch <5s, cache hit <10ms
  - [ ] API: response < 2s (including Google Play API calls)
  - [ ] Memory usage reasonable (no leaks, no unbounded growth)

- [ ] Edge cases handled:
  - [ ] Network timeouts
  - [ ] Corrupted cache (malformed timestamps)
  - [ ] Concurrent verification calls
  - [ ] App foreground/background transitions
  - [ ] Device rotation (not applicable for background service)
  - [ ] Low battery, low storage scenarios (graceful degradation)

#### Reviewer Sign-Off

- [ ] **Reviewer 1** (Backend): _________________ Date: _______
- [ ] **Reviewer 2** (Mobile): _________________ Date: _______
- [ ] **QA/Tester**: _________________ Date: _______

**Approval**: Ready for merge ✅

---

## Risk Checklist (Pre-Production)

Before deploying to production:

- [ ] **Sideload blocking verified** on actual Android device with Play Store app installed
- [ ] **Offline functionality verified** in real network conditions (not just emulator)
- [ ] **Performance tested** on low-end Android device (not just high-end emulator)
- [ ] **Rollback plan** documented (how to disable feature if issues arise)
- [ ] **Monitoring setup** in place (CloudWatch logs for /api/integrity/verify)
- [ ] **Team communication** sent (notify users of potential blocking if re-install needed)

---

## Approval Workflow

1. **Engineering Review**: All checks above must pass
2. **QA Testing**: Manual testing on iOS/Android devices
3. **Tech Lead Sign-Off**: Architecture and design review
4. **Release Manager**: Final approval for merge to main
5. **Deployment**: Merge to main, tag release, deploy to AWS

---

**Last Updated**: February 18, 2026  
**Reviewed by**: [To be filled]  
**Status**: 📋 Ready for review
