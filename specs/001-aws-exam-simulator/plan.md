# Implementation Plan: AWS Cloud Practitioner Exam Simulator

**Branch**: `001-aws-exam-simulator` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-aws-exam-simulator/spec.md`

## Summary

Build a React Native mobile app that simulates the AWS Cloud Practitioner (CLF-C02) certification exam. The app provides timed exam simulation (65 questions, 90 minutes), practice mode with domain/difficulty filtering, post-exam review with explanations, and performance analytics. Questions are managed via a backend admin API and synced to devices, with offline-first architecture for exam-taking. Monetized as a paid Play Store app.

## Technical Context

**Language/Version**: TypeScript 5.x (React Native), Node.js 20.x (API)
**Primary Dependencies**: React Native 0.76+, Expo SDK 52+, React Navigation 7, SQLite (via expo-sqlite), Zustand (state management), react-native-gifted-charts (analytics)
**Storage**: SQLite (local on-device for questions, exams, analytics), PostgreSQL (backend for admin question management)
**Testing**: Jest + React Native Testing Library (unit/component), Detox (E2E), Supertest (API)
**Target Platform**: Android (Play Store), React Native with Expo managed workflow
**Project Type**: Mobile + API (React Native app + Node.js admin backend)
**Performance Goals**: App launch < 3s, question load < 100ms, exam auto-save < 500ms, sync < 10s
**Constraints**: Offline-capable for exam-taking, < 50MB app size, single exam focus (CLF-C02 only)
**Scale/Scope**: ~500-1000 questions in bank, ~8 screens (mobile), admin panel (web), single API

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> **Note**: The project constitution is not yet configured (still template). Proceeding with sensible defaults aligned to the project's simplicity constraints.

**Applied principles (self-imposed)**:
- **Simplicity**: Minimal dependencies, no over-engineering. SQLite for local storage (no ORM abstraction layer). Direct API calls (no GraphQL complexity).
- **Offline-First**: Core exam functionality must work without network. Questions cached locally.
- **Test Coverage**: Unit tests for scoring logic and domain weighting. Integration tests for exam flow. E2E tests for critical user journeys.
- **Single Responsibility**: Clear separation between mobile app, admin API, and admin panel.

**Gate Status**: PASS (no violations detected)

## Project Structure

### Documentation (this feature)

```text
specs/001-aws-exam-simulator/
├── plan.md              # This file
├── research.md          # Phase 0: technology decisions and rationale
├── data-model.md        # Phase 1: entity definitions and relationships
├── quickstart.md        # Phase 1: setup and run instructions
├── contracts/           # Phase 1: API contract specifications
│   └── api.yaml         # OpenAPI 3.0 spec for admin/sync API
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
api/
├── src/
│   ├── models/          # Drizzle ORM schema (Question, AnswerOption)
│   ├── routes/          # Fastify routes (questions, sync, auth)
│   ├── services/        # Business logic (question management, sync)
│   ├── middleware/       # Auth, validation, error handling
│   └── index.ts         # Server entry point
├── tests/
│   ├── unit/            # Service logic tests
│   └── integration/     # API endpoint tests
├── seed/                # Default question bank seed data
├── package.json
└── tsconfig.json

mobile/
├── src/
│   ├── components/      # Reusable UI components (QuestionCard, Timer, ProgressBar)
│   ├── screens/         # Screen components (Home, Exam, Practice, Review, Analytics)
│   ├── navigation/      # React Navigation stack/tab configuration
│   ├── services/        # Business logic (scoring, question selection, sync)
│   ├── stores/          # Zustand stores (exam, practice, analytics, questions)
│   ├── db/              # SQLite database setup, migrations, queries
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helpers (timer, formatting, domain weights)
├── assets/              # Icons, images, fonts
├── tests/
│   ├── unit/            # Service and store tests
│   ├── component/       # React component tests
│   └── e2e/             # Detox end-to-end tests
├── app.json             # Expo configuration
├── package.json
└── tsconfig.json
```

**Structure Decision**: Mobile + API architecture. The `mobile/` directory contains the React Native (Expo) app targeting Android. The `api/` directory contains the Node.js/Fastify backend with Drizzle ORM and AdminJS for admin question management and question sync. This separation allows independent deployment and testing while keeping the codebase manageable.

## Complexity Tracking

> No constitution violations to justify. Architecture is intentionally minimal:
> - 2 projects (mobile + API) is the minimum for the offline-first + admin management requirement
> - No ORM abstraction; direct SQLite queries on mobile, lightweight ORM on API
> - No state management library complexity; Zustand is minimal by design

## Constitution Check (Post-Design Re-evaluation)

**Reviewed after Phase 1 design completion.**

| Principle | Status | Notes |
|-----------|--------|-------|
| Simplicity | PASS | 2 projects (mobile + API), minimal dependencies. Drizzle ORM is near-zero overhead. AdminJS generates admin UI from schema. |
| Offline-First | PASS | expo-sqlite with WAL mode for local storage. Exam state persisted to SQLite. Bundled default questions for first-time use. |
| Test Coverage | PASS | Strategy defined: Jest for unit, RNTL for components, Supertest for API, Detox for E2E. Scoring algorithm and domain weighting are primary unit test targets. |
| Single Responsibility | PASS | Clear boundaries: mobile app (Expo/RN), API server (Fastify), admin panel (AdminJS plugin), data layer (Drizzle/SQLite). |

**Post-Design Gate Status**: PASS

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Feature Spec | `specs/001-aws-exam-simulator/spec.md` | Complete |
| Implementation Plan | `specs/001-aws-exam-simulator/plan.md` | Complete |
| Research | `specs/001-aws-exam-simulator/research.md` | Complete |
| Data Model | `specs/001-aws-exam-simulator/data-model.md` | Complete |
| API Contracts | `specs/001-aws-exam-simulator/contracts/api.yaml` | Complete |
| Quickstart | `specs/001-aws-exam-simulator/quickstart.md` | Complete |
| Agent Context | `CLAUDE.md` | Created |
| Tasks | `specs/001-aws-exam-simulator/tasks.md` | Pending (`/speckit.tasks`) |
