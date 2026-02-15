# Implementation Plan: CloudPrep Mobile

**Branch**: `002-cloudprep-mobile` | **Date**: 2026-02-12 | **Spec**: [spec.md](spec.md) | **Status**: ✅ Complete (2026-02-15)  
**Input**: Feature specification from `/specs/002-cloudprep-mobile/spec.md`  
**Implementation Reports**: [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md) | [T111_PERFORMANCE_TESTS.md](T111_PERFORMANCE_TESTS.md)

## Summary

AWS Cloud Practitioner exam preparation mobile app with offline-first architecture. Mobile app (React Native + Expo) handles exam simulation, practice sessions, review, and analytics with local SQLite storage. Backend API (NestJS + Prisma + PostgreSQL) serves question bank content with multi-tenant ExamType support for multiple certification exams. Admin portal (React SPA) manages questions via approval workflow across all exam types.

## Technical Context

**Language/Version**: TypeScript 5.x (all components)  
**Primary Dependencies**: React Native (Expo SDK 50+), NestJS, Fastify, Prisma ORM, PostgreSQL 15+, expo-sqlite, Zustand, React Navigation  
**Storage**: PostgreSQL (backend question bank with ExamType), SQLite via expo-sqlite (mobile local)  
**Testing**: Jest, React Native Testing Library, Detox (mobile), Supertest (API)  
**Target Platform**: Android 10+ (primary), iOS 15+ (deferred, same codebase)  
**Project Type**: mobile + api (Mobile app + Backend API + Admin Portal)  
**Performance Goals**: App launch <3s, screen transitions <300ms, question render <100ms  
**Constraints**: Offline-capable, <50MB storage for question bank, no user data transmitted to servers  
**Scale/Scope**: 200+ questions per exam type, single-user per device, ~8 screens (home, exam, practice, review, analytics, settings, question list, results)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Constitution is currently a template (not customized for this project). No specific gates to evaluate. Proceeding with standard best practices:

- Test-first approach for critical paths
- Simple architecture preferred
- Documentation required for all public APIs

## Project Structure

### Documentation (this feature)

```text
specs/002-cloudprep-mobile/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
api/                          # Backend API + Admin Portal (NestJS)
├── prisma/
│   ├── schema.prisma         # Database schema (ExamType, Question, Admin)
│   ├── migrations/           # Database migrations
│   └── seed.ts               # Seed data for exam types and questions
├── src/
│   ├── exam-types/           # ExamTypes module (multi-tenant support)
│   ├── questions/            # Questions module (public API)
│   ├── admin/                # Admin module (auth, CRUD)
│   ├── prisma/               # Prisma service
│   ├── common/               # Shared DTOs, guards, filters
│   ├── app.module.ts         # Root module
│   └── main.ts               # Entry point
├── admin-portal/             # React SPA for admin (served by NestJS)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
└── test/
    ├── unit/
    └── e2e/

mobile/                       # Mobile app (React Native + Expo)
├── src/
│   ├── screens/              # UI screens
│   ├── components/           # Reusable components
│   ├── services/             # Business logic
│   ├── stores/               # Zustand stores
│   ├── storage/              # SQLite database
│   ├── config/               # App config (EXAM_TYPE)
│   └── navigation/           # React Navigation
└── __tests__/
```

**Structure Decision**: Mobile + API architecture with multi-tenant backend. API serves question bank content filtered by exam type; admin portal manages all exam types in one place; each mobile app has hardcoded EXAM_TYPE config.

## Implementation Verification

### ✅ Backend Delivery (api/)

| Component | Status | Notes |
|-----------|--------|-------|
| **Exam-Types Module** | ✅ | Endpoints: GET /exam-types/{id}, /questions, /questions/version (FR-001, FR-026-029) |
| **Questions Module** | ✅ | Public API delivers question bank filtered by exam type |
| **Admin Module** | ✅ | JWT auth, POST/PUT/GET endpoints, approval workflow (FR-021-025) |
| **Prisma ORM** | ✅ | ExamType, Question, Admin, User, ExamAttempt, PracticeSession models |
| **Database** | ✅ | PostgreSQL schema with migrations applied (20260212070024_init) |
| **Admin Portal** | ✅ | React SPA (api/admin-portal/), Vite config, static serving via NestJS |

### ✅ Mobile Delivery (mobile/)

| Component | Status | Notes |
|-----------|--------|-------|
| **Services (8)** | ✅ | ExamGenerator, ExamSession, Scoring, Practice, Review, Analytics, Sync, Network |
| **SQLite Storage** | ✅ | Offline database with Question, ExamAttempt, PracticeSession, UserStats schemas |
| **Screens (10)** | ✅ | Home, Exam, Results, Practice, Review, History, Analytics, Settings + 2 more |
| **Components (15+)** | ✅ | QuestionCard, Timer, Navigator, FeedbackCard, Chart components, etc. |
| **State Management** | ✅ | Zustand stores for exam, practice, review, analytics |
| **Navigation** | ✅ | React Navigation with RootNavigator configured |
| **Offline Support** | ✅ | Full offline capability, bundled question bank, background sync (FR-026-030) |

### ✅ Test Infrastructure

**Unit Tests** (78 test cases, ~200+ assertions):
- Mobile: ExamGeneratorService (14), ExamSessionService (18), ScoringService (26)
- API: AdminAuthService (6), QuestionsService (14)
- Jest config with 60% global, 80% services coverage targets

**Performance Benchmarks** (21 test cases):
- T111a: App launch (<3s), SQLite init, config load, navigation bootstrap
- T111b: Screen transitions (<300ms), 4 critical paths tested
- T111c: Question rendering (<100ms), simple/complex/sequential scenarios

### ✅ Requirements Traceability

| Category | Coverage | Notes |
|----------|----------|-------|
| **Functional Requirements** | 33/33 | 100% - FR-001 through FR-033 implemented |
| **User Stories** | 5/5 | 100% - US1 (Exam) through US5 (Admin) complete |
| **Success Criteria** | 12/12 | 100% - All measurable outcomes achievable |
| **Non-Functional Requirements** | 100% | Performance (FR-031-033), Offline (FR-026-030), Security (FR-030) |

## Complexity Tracking

✅ **Architecture**: No complexity violations identified. Clear separation of concerns:
- Frontend (mobile) handles UI, local state, offline logic
- Backend (API) handles content delivery, multi-tenant routing
- Admin portal (SPA) handles content management
- All communication through REST API with versioned question bank

✅ **Dependencies**: All explicit dependencies satisfied:
- Phase 1 Setup → Phase 2 Foundation → User Stories (3-7) → Polishing

✅ **Test Coverage**: Professional test organization with mocking patterns, proper isolation, clear traceability to requirements.

---

# Phase 2 Planning: Authentication & Cloud Sync (NEW)

**Status**: Requirements specified (US6-US8, FR-034-041, SC-013-016), detailed tasks ready for execution.

**Scope**: Add optional Google OAuth authentication and cloud persistence of exam history while maintaining backward compatibility with offline-only Phase 1 design.

---

## Detailed Phase 2 Task Breakdown (T112-T169)

**Total Effort Estimate**: ~58 dev-hours (~7 person-days, or 2 weeks at 2 developers in parallel)  
**Execution Phases**: Backend Auth → Persistence → Mobile Integration → Testing  
**Recommended Timeline**: 4 weeks (1 week per phase)

### PHASE 2A: Backend User & Authentication Infrastructure (T112-T119, ~10 hours)

**T112**: Extend Prisma User Model → Add googleId (UNIQUE), email, oauthToken fields  
**T113**: Create Google OAuth Service → Verify ID tokens from @react-native-google-signin/google-signin  
**T114**: Create User Service → findOrCreateByGoogleId(), updateLastLogin() operations  
**T115**: Create JWT Service → generateTokens(), verifyAccessToken(), verifyRefreshToken() (1hr, 30min expiry)  
**T116**: Create Auth Controller → POST /auth/google/callback, GET /auth/me, POST /auth/refresh endpoints  
**T117**: Create JWT Auth Guard → Middleware to validate Authorization header with JWT tokens  
**T118**: Create JWT Strategy → Passport.js adapter for JWT extraction and validation  
**T119**: Create Auth Module → NestJS module providing GoogleOAuthService, UserService, JwtService  

**Success Criteria**: All 6+ tests passing, authentication flow works from mobile sign-in through token validation.

### PHASE 2B: Backend Exam Persistence & Analytics (T120-T127, ~13 hours)

**T120**: Extend Prisma ExamAttempt Model → Add userId (FK, nullable), syncStatus, syncedAt, syncRetries  
**T121**: Create Database Migration → Apply schema changes, backfill existing attempts with syncStatus='synced'  
**T122**: Create ExamAttempt Service → CRUD operations, sync status tracking, pending queue queries  
**T123**: Create Exam-Attempts Controller → POST /exam-attempts (submit), GET /exam-attempts (history), pagination  
**T124**: Create Analytics Service → Server-side aggregation (totalAttempts, passRate, avgScore, byExamType)  
**T125**: Create Analytics Controller → GET /exam-attempts/analytics with optional examTypeId filter  
**T126**: Create Exam-Attempts Module → NestJS module integrating all exam persistence services  
**T127**: Create Offline Sync Queue Service → Backend processor for retry logic with exponential backoff (background job)  

**Success Criteria**: All endpoints return correct data structures, analytics calculations accurate, sync retry logic tested with backoff timings.

### PHASE 2C: Mobile Auth & Offline Sync Integration (T128-T142, ~20 hours)

**T128**: Install OAuth Library → expo-auth-session, expo-web-browser, expo-crypto; configure Client IDs in .env and app.json  
**T129**: Create Auth Service (Mobile) → useGoogleAuthRequest() hook + handleGoogleAuthSuccess() using expo-auth-session (Expo Go compatible)  
**T130**: Create AsyncStorage Adapter → saveTokens(), getAccessToken(), clearTokens() for JWT persistence  
**T131**: Create API Interceptor → Auto-inject Authorization header, detect 401, trigger refresh  
**T132**: Create Auth Context & Store → Zustand store for isSignedIn, user, accessToken  
**T133**: Create Token Refresh Service → POST /auth/refresh, logout on failure  
**T134**: Create Auth Screen UI → "Sign in with Google" button (expo-auth-session hook), loading, logout, profile  
**T135**: Update Home Screen → Show user, logout if signed in, sign-in link if not  
**T136**: Integrate Exam Submission → POST exam to /exam-attempts if signed in  
**T137**: Create Connectivity Listener → Detect online/offline state changes  
**T138**: Create Offline Queue Service (Mobile) → SQLite table for pending exams  
**T139**: Create Sync Queue Processor → Process pending on restore, exponential backoff  
**T140**: Integrate Sync with Zustand → Add sync state tracking  
**T141**: Create Sync Status Indicator UI → Show syncing/synced/pending status  
**T142**: Create Cloud Analytics Screen → Display /exam-attempts/analytics summary  

**Success Criteria**: Full OAuth flow tested, offline queue persists, sync <5s for 50 exams, analytics correct.

### PHASE 2D: Integration Testing & Documentation (T143-T150, ~15 hours)

**T143**: E2E Auth Flow Test → Mocked sign-in, token storage, auto-injection  
**T144**: Offline Queue Integration Test → Offline exam → sync on restore  
**T145**: API Integration Test → All Phase 2 endpoints tested  
**T146**: Analytics Engine Test → Verify aggregation calculations  
**T147**: Sync Processor Test → Exponential backoff, max retry logic  
**T148**: Performance Benchmarks → Cloud sync <5s, analytics <2s, refresh <500ms  
**T149**: Manual Testing Scenarios → Sign-in, sync, token expiration flows  
**T150**: Phase 2 Documentation → OAuth, sync, analytics, migration guides  

**Success Criteria**: 4+ integration tests passing, performance targets met, docs complete.

---

## Next Steps

1. Request `/speckit.tasks 002-cloudprep-mobile --append` to generate detailed task acceptance criteria
2. Begin Week 1: Backend auth infrastructure (T112-T119)
3. Phase 0 research complete; Phase 1 design artifacts updated
