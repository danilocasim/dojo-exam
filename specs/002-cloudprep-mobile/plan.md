# Implementation Plan: CloudPrep Mobile

**Branch**: `002-cloudprep-mobile` | **Date**: February 12, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-cloudprep-mobile/spec.md`

## Summary

CloudPrep Mobile is a React Native mobile app for AWS Cloud Practitioner exam preparation. The app provides offline-first timed exam simulations (65 questions, 90 minutes), domain-based practice mode with immediate feedback, exam review with explanations, and performance analytics. All user data is stored locally on-device; a lightweight cloud API delivers question bank updates only.

## Technical Context

**Language/Version**: TypeScript 5.x with React Native 0.73+  
**Primary Dependencies**: React Native, Expo (managed workflow), React Navigation, SQLite (expo-sqlite), Zustand (state management)  
**Storage**: SQLite for local persistence (questions, attempts, analytics); AsyncStorage for preferences  
**Testing**: Jest + React Native Testing Library (unit/component), Detox (E2E)  
**Target Platform**: Android (Play Store paid app), minimum SDK 24 (Android 7.0)  
**Project Type**: Mobile + Admin API (separate concerns)  
**Performance Goals**: App launch <3s, screen transitions <300ms, question render <100ms  
**Constraints**: Offline-capable, <50MB question bank, no user data transmitted remotely  
**Scale/Scope**: Single exam (AWS CCP), 200+ questions, ~10 screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file contains template placeholders (not yet customized for this project). No specific gates are defined. Proceeding with standard best practices:

| Principle | Status | Notes |
|-----------|--------|-------|
| Simplicity | ✅ PASS | Single exam focus, offline-first, no auth complexity |
| Testability | ✅ PASS | Component testing + E2E planned |
| Separation of Concerns | ✅ PASS | Mobile app + Admin API cleanly separated |

## Project Structure

### Documentation (this feature)

```text
specs/002-cloudprep-mobile/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API specs)
│   └── api.yaml         # Question bank API contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Mobile App (React Native / Expo)
app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── questions/       # Question display components
│   │   ├── navigation/      # Nav components (timer, progress)
│   │   └── analytics/       # Charts, progress indicators
│   ├── screens/             # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── ExamScreen.tsx
│   │   ├── PracticeScreen.tsx
│   │   ├── ReviewScreen.tsx
│   │   └── AnalyticsScreen.tsx
│   ├── services/            # Business logic
│   │   ├── exam/            # Exam generation, scoring
│   │   ├── practice/        # Practice session logic
│   │   ├── storage/         # SQLite operations
│   │   └── sync/            # Question bank sync
│   ├── stores/              # Zustand state stores
│   ├── models/              # TypeScript interfaces
│   ├── utils/               # Helpers, constants
│   └── navigation/          # React Navigation config
├── assets/                  # Images, fonts
└── __tests__/               # Test files mirroring src/

# Admin API (content delivery only)
api/
├── src/
│   ├── routes/              # Express/Fastify routes
│   ├── services/            # Question bank management
│   └── models/              # Question schema
└── tests/

# Shared
contracts/
└── question-bank.schema.json  # Shared schema for questions
```

**Structure Decision**: Mobile + API separation. The mobile app is the primary deliverable; the API is a minimal content-delivery service for question bank updates. Admin portal (P3) is out of scope for initial release—questions managed via direct API/database access.

## Complexity Tracking

No constitution violations requiring justification. Architecture follows minimal viable approach:
- Single SQLite database for all local data
- Direct Zustand stores (no Redux complexity)
- Expo managed workflow (no native module complexity)
- Minimal API (GET endpoints only for question bank)
