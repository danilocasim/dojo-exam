# Tasks: CloudPrep Mobile

**Input**: Design documents from `/specs/002-cloudprep-mobile/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Exact file paths included in descriptions

## Path Conventions

Based on plan.md structure:

- **Mobile app**: `app/src/`
- **API**: `api/src/`
- **Contracts**: `contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create Expo project with TypeScript template in app/
- [ ] T002 Initialize API project with Express/TypeScript in api/
- [ ] T003 [P] Configure ESLint and Prettier for app/ with React Native rules
- [ ] T004 [P] Configure ESLint and Prettier for api/ with Node.js rules
- [ ] T005 [P] Create shared contracts directory with question-bank.schema.json
- [ ] T006 Install core dependencies: expo-sqlite, zustand, react-navigation, nativewind in app/
- [ ] T007 [P] Install API dependencies: express, cors, helmet in api/
- [ ] T008 Configure NativeWind (Tailwind CSS) in app/tailwind.config.js
- [ ] T009 Create directory structure per plan.md in app/src/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 Define TypeScript interfaces in app/src/models/types.ts (Question, ExamAttempt, ExamAnswer, PracticeSession, PracticeAnswer, Domain, Difficulty enums)
- [ ] T011 Implement database schema creation in app/src/services/storage/schema.ts
- [ ] T012 Implement DatabaseService with connection management in app/src/services/storage/database.ts
- [ ] T013 Implement QuestionRepository CRUD operations in app/src/services/storage/questionRepository.ts
- [ ] T014 [P] Create domain constants (labels, weights, quotas) in app/src/utils/constants.ts
- [ ] T015 [P] Create UUID generation utility in app/src/utils/uuid.ts
- [ ] T016 Configure React Navigation stack in app/src/navigation/AppNavigator.tsx
- [ ] T017 Create base screen layout component in app/src/components/ScreenLayout.tsx
- [ ] T018 Implement SyncMetaRepository for version tracking in app/src/services/storage/syncMetaRepository.ts
- [ ] T019 Bundle seed question data (minimum viable set) in app/assets/seed-questions.json
- [ ] T020 Implement database initialization with seed data loading in app/src/services/storage/initDatabase.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Timed Exam Simulation (Priority: P1) 🎯 MVP

**Goal**: Users can take a full 65-question timed exam with auto-save, navigation, and scoring

**Independent Test**: Launch exam → answer questions → submit → see pass/fail score with domain breakdown

### Implementation for User Story 1

- [ ] T021 [US1] Implement ExamAttemptRepository CRUD in app/src/services/storage/examAttemptRepository.ts
- [ ] T022 [US1] Implement ExamAnswerRepository CRUD in app/src/services/storage/examAnswerRepository.ts
- [ ] T023 [US1] Implement exam generation service with domain weighting in app/src/services/exam/examGenerator.ts
- [ ] T024 [US1] Implement exam scoring service with pass/fail logic in app/src/services/exam/examScorer.ts
- [ ] T025 [US1] Implement exam state persistence service in app/src/services/exam/examPersistence.ts
- [ ] T026 [US1] Create Zustand exam store in app/src/stores/examStore.ts
- [ ] T027 [P] [US1] Create QuestionCard component in app/src/components/questions/QuestionCard.tsx
- [ ] T028 [P] [US1] Create OptionButton component in app/src/components/questions/OptionButton.tsx
- [ ] T029 [P] [US1] Create CountdownTimer component in app/src/components/navigation/CountdownTimer.tsx
- [ ] T030 [P] [US1] Create QuestionNavigator component (prev/next/jump) in app/src/components/navigation/QuestionNavigator.tsx
- [ ] T031 [P] [US1] Create FlagButton component in app/src/components/navigation/FlagButton.tsx
- [ ] T032 [P] [US1] Create ProgressIndicator component in app/src/components/navigation/ProgressIndicator.tsx
- [ ] T033 [US1] Implement HomeScreen with exam start button in app/src/screens/HomeScreen.tsx
- [ ] T034 [US1] Implement ExamScreen with timer, question display, navigation in app/src/screens/ExamScreen.tsx
- [ ] T035 [US1] Implement ExamResultScreen with score and domain breakdown in app/src/screens/ExamResultScreen.tsx
- [ ] T036 [US1] Add exam resumption logic (check for in-progress exam on app launch) in app/src/services/exam/examResumption.ts
- [ ] T037 [US1] Implement expired exam cleanup (mark abandoned after 24h) in app/src/services/exam/examCleanup.ts
- [ ] T038 [US1] Add auto-save on answer selection and navigation in examStore.ts
- [ ] T039 [US1] Implement timer expiry handling with auto-submit in ExamScreen.tsx

**Checkpoint**: User Story 1 complete - users can take full timed exams with all core features

---

## Phase 4: User Story 2 - Practice by Domain (Priority: P1) 🎯 MVP

**Goal**: Users can practice questions filtered by domain and difficulty with immediate feedback

**Independent Test**: Select domain → answer questions → see immediate feedback with explanations

### Implementation for User Story 2

- [ ] T040 [US2] Implement PracticeSessionRepository CRUD in app/src/services/storage/practiceSessionRepository.ts
- [ ] T041 [US2] Implement PracticeAnswerRepository CRUD in app/src/services/storage/practiceAnswerRepository.ts
- [ ] T042 [US2] Implement practice question fetcher with filters in app/src/services/practice/practiceQuestionService.ts
- [ ] T043 [US2] Create Zustand practice store in app/src/stores/practiceStore.ts
- [ ] T044 [P] [US2] Create DomainSelector component in app/src/components/practice/DomainSelector.tsx
- [ ] T045 [P] [US2] Create DifficultySelector component in app/src/components/practice/DifficultySelector.tsx
- [ ] T046 [P] [US2] Create FeedbackOverlay component (correct/incorrect + explanation) in app/src/components/questions/FeedbackOverlay.tsx
- [ ] T047 [P] [US2] Create SessionSummary component in app/src/components/practice/SessionSummary.tsx
- [ ] T048 [US2] Implement PracticeSetupScreen with domain/difficulty selection in app/src/screens/PracticeSetupScreen.tsx
- [ ] T049 [US2] Implement PracticeScreen with immediate feedback flow in app/src/screens/PracticeScreen.tsx
- [ ] T050 [US2] Implement PracticeSummaryScreen with session results in app/src/screens/PracticeSummaryScreen.tsx
- [ ] T051 [US2] Add practice mode entry point to HomeScreen.tsx
- [ ] T052 [US2] Implement end-session-anytime functionality in practiceStore.ts

**Checkpoint**: User Story 2 complete - users can practice with filtered questions and immediate feedback

---

## Phase 5: User Story 3 - Review Exam Results (Priority: P2)

**Goal**: Users can review completed exams with explanations and filter by correctness

**Independent Test**: Complete exam → enter review → see all questions with answers and explanations → filter by incorrect

### Implementation for User Story 3

- [ ] T053 [US3] Implement exam history query service in app/src/services/review/examHistoryService.ts
- [ ] T054 [US3] Implement exam detail loader with answers in app/src/services/review/examDetailService.ts
- [ ] T055 [US3] Create Zustand review store in app/src/stores/reviewStore.ts
- [ ] T056 [P] [US3] Create ExamHistoryCard component in app/src/components/review/ExamHistoryCard.tsx
- [ ] T057 [P] [US3] Create ReviewQuestionCard component (shows user answer, correct answer, explanation) in app/src/components/review/ReviewQuestionCard.tsx
- [ ] T058 [P] [US3] Create CorrectIncorrectFilter component in app/src/components/review/CorrectIncorrectFilter.tsx
- [ ] T059 [P] [US3] Create DomainBreakdownCard component in app/src/components/review/DomainBreakdownCard.tsx
- [ ] T060 [US3] Implement ExamHistoryScreen with list of completed exams in app/src/screens/ExamHistoryScreen.tsx
- [ ] T061 [US3] Implement ReviewScreen with question review and filtering in app/src/screens/ReviewScreen.tsx
- [ ] T062 [US3] Add review entry point to ExamResultScreen.tsx and HomeScreen.tsx
- [ ] T063 [US3] Implement domain breakdown calculation in examDetailService.ts

**Checkpoint**: User Story 3 complete - users can review past exams with full explanations

---

## Phase 6: User Story 4 - Performance Analytics (Priority: P2)

**Goal**: Users can see performance trends, domain averages, and study statistics

**Independent Test**: Take multiple exams → view analytics → see score trends and weak domains highlighted

### Implementation for User Story 4

- [ ] T064 [US4] Implement UserStatsRepository CRUD in app/src/services/storage/userStatsRepository.ts
- [ ] T065 [US4] Implement analytics calculation service in app/src/services/analytics/analyticsService.ts
- [ ] T066 [US4] Implement domain performance aggregator in app/src/services/analytics/domainPerformanceService.ts
- [ ] T067 [US4] Implement weak domain identifier (below 70%) in app/src/services/analytics/weakDomainService.ts
- [ ] T068 [US4] Create Zustand analytics store in app/src/stores/analyticsStore.ts
- [ ] T069 [P] [US4] Create ScoreTrendChart component in app/src/components/analytics/ScoreTrendChart.tsx
- [ ] T070 [P] [US4] Create DomainPerformanceCard component in app/src/components/analytics/DomainPerformanceCard.tsx
- [ ] T071 [P] [US4] Create StudyStatsCard component in app/src/components/analytics/StudyStatsCard.tsx
- [ ] T072 [P] [US4] Create WeakDomainAlert component in app/src/components/analytics/WeakDomainAlert.tsx
- [ ] T073 [P] [US4] Create StrengthIndicator component (strong/moderate/weak) in app/src/components/analytics/StrengthIndicator.tsx
- [ ] T074 [US4] Implement AnalyticsScreen with all dashboard components in app/src/screens/AnalyticsScreen.tsx
- [ ] T075 [US4] Add analytics entry point to HomeScreen.tsx
- [ ] T076 [US4] Implement time tracking (update totalTimeSpent on exam/practice completion) in userStatsRepository.ts

**Checkpoint**: User Story 4 complete - users can view comprehensive performance analytics

---

## Phase 7: User Story 5 - Question Bank Sync (Priority: P3)

**Goal**: App syncs question bank updates from cloud API when online

**Independent Test**: Start app with network → detect new version → download updates → verify questions available

### API Implementation (Minimal Content Delivery)

- [ ] T077 [US5] Define Question model in api/src/models/question.ts
- [ ] T078 [US5] Implement question storage service in api/src/services/questionService.ts
- [ ] T079 [US5] Implement GET /questions endpoint with since parameter in api/src/routes/questions.ts
- [ ] T080 [US5] Implement GET /questions/version endpoint in api/src/routes/questions.ts
- [ ] T081 [US5] Implement GET /health endpoint in api/src/routes/health.ts
- [ ] T082 [US5] Configure Express app with routes in api/src/app.ts
- [ ] T083 [US5] Add CORS and security headers middleware in api/src/middleware/security.ts

### Mobile Sync Implementation

- [ ] T084 [US5] Implement API client with axios in app/src/services/sync/apiClient.ts
- [ ] T085 [US5] Implement version check service in app/src/services/sync/versionCheckService.ts
- [ ] T086 [US5] Implement question sync service in app/src/services/sync/questionSyncService.ts
- [ ] T087 [US5] Implement network connectivity detection in app/src/services/sync/networkService.ts
- [ ] T088 [US5] Create Zustand sync store in app/src/stores/syncStore.ts
- [ ] T089 [US5] Add sync trigger on app launch (if online) in app/App.tsx
- [ ] T090 [P] [US5] Create SyncStatusIndicator component in app/src/components/sync/SyncStatusIndicator.tsx
- [ ] T091 [US5] Add sync status display to HomeScreen.tsx

**Checkpoint**: User Story 5 complete - app syncs question bank from cloud API

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, error handling, and production readiness

- [ ] T092 Implement global error boundary in app/src/components/ErrorBoundary.tsx
- [ ] T093 Add loading states to all screens with LoadingSpinner component
- [ ] T094 Implement empty state components for analytics (no exams yet) in app/src/components/EmptyState.tsx
- [ ] T095 Add keyboard handling for question navigation in ExamScreen.tsx
- [ ] T096 Implement app launch performance optimization (lazy loading) in App.tsx
- [ ] T097 Add TypeScript strict mode validation and fix any type errors
- [ ] T098 Configure Android app.json with Play Store metadata
- [ ] T099 Create production build configuration in eas.json
- [ ] T100 Write README.md with setup and deployment instructions

---

## Dependency Graph

```
Phase 1 (Setup)
     │
     ▼
Phase 2 (Foundation) ─────────────────────────────────────────┐
     │                                                        │
     ├──────────────┬──────────────┬──────────────┐          │
     ▼              ▼              ▼              ▼          │
Phase 3 (US1)  Phase 4 (US2)  Phase 7 (US5)    [parallel]   │
  Exam Mode     Practice Mode    Sync API                    │
     │              │              │                         │
     └──────┬───────┘              │                         │
            ▼                      │                         │
     Phase 5 (US3) ◄───────────────┘                         │
      Review Mode                                            │
            │                                                │
            ▼                                                │
     Phase 6 (US4)                                           │
      Analytics                                              │
            │                                                │
            ▼                                                │
     Phase 8 (Polish) ◄──────────────────────────────────────┘
```

## Parallel Execution Opportunities

### Within Phase 2 (Foundation)

- T014, T015 can run in parallel (utilities with no dependencies)

### Within Phase 3 (US1)

- T027, T028, T029, T030, T031, T032 can all run in parallel (UI components)

### Within Phase 4 (US2)

- T044, T045, T046, T047 can run in parallel (UI components)

### Within Phase 5 (US3)

- T056, T057, T058, T059 can run in parallel (UI components)

### Within Phase 6 (US4)

- T069, T070, T071, T072, T073 can run in parallel (UI components)

### Cross-Phase Parallelism

- Phase 3 (US1) and Phase 4 (US2) can run in parallel after Phase 2
- Phase 7 (US5 API) can start after Phase 2, independent of other user stories

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Phases 1-4**: Setup + Foundation + US1 (Exam) + US2 (Practice)

This delivers:

- ✅ Full timed exam simulation (core value proposition)
- ✅ Domain-based practice mode
- ✅ Offline-first with bundled questions
- ✅ Local progress tracking

**Estimated Tasks**: 52 tasks (T001-T052)

### Full Release

**All Phases**: MVP + US3 (Review) + US4 (Analytics) + US5 (Sync) + Polish

Adds:

- ✅ Exam review with explanations
- ✅ Performance analytics dashboard
- ✅ Cloud question bank sync
- ✅ Production polish

**Total Tasks**: 100 tasks

---

## Summary

| Phase     | User Story          | Tasks   | Parallelizable |
| --------- | ------------------- | ------- | -------------- |
| 1         | Setup               | 9       | 4              |
| 2         | Foundation          | 11      | 2              |
| 3         | US1 - Exam Mode     | 19      | 6              |
| 4         | US2 - Practice Mode | 13      | 4              |
| 5         | US3 - Review Mode   | 11      | 4              |
| 6         | US4 - Analytics     | 13      | 5              |
| 7         | US5 - Sync          | 15      | 1              |
| 8         | Polish              | 9       | 0              |
| **Total** |                     | **100** | **26**         |
