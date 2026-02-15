# Data Model: CloudPrep Mobile

**Feature**: 002-cloudprep-mobile  
**Date**: February 12, 2026  
**Storage**: SQLite (mobile), PostgreSQL (backend)

## Overview

This document defines data models for both:

1. **Mobile Local Storage (SQLite)**: User data, exam attempts, cached questions
2. **Backend Database (PostgreSQL/Prisma)**: Question bank, admin management

---

## Backend Database (PostgreSQL + Prisma)

### Entity Relationship Diagram - Phase 1 + Phase 2

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (PostgreSQL)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐                                                       │
│  │    ExamType      │                                                       │
│  ├──────────────────┤                                                       │
│  │ id (PK, TEXT)    │ ◀─────────────────┐                                   │
│  │ name             │                   │                                   │
│  │ displayName      │                   │                                   │
│  │ description      │                   │                                   │
│  │ domains (JSON)   │                   │                                   │
│  │ passingScore     │                   │                                   │
│  │ timeLimit        │                   │                                   │
│  │ questionCount    │                   │                                   │
│  │ isActive         │                   │                                   │
│  │ createdAt        │                   │                                   │
│  │ updatedAt        │                   │                                   │
│  └──────────────────┘                   │                                   │
│                                         │                                   │
│  ┌──────────────────┐       ┌──────────────────┐                           │
│  │     Question     │       │      Admin       │                           │
│  ├──────────────────┤       ├──────────────────┤                           │
│  │ id (PK, UUID)    │       │ id (PK, UUID)    │                           │
│  │ examTypeId (FK)  │───────┤ email            │                           │
│  │ text             │       │ passwordHash     │                           │
│  │ type             │       │ name             │                           │
│  │ domain           │       │ createdAt        │                           │
│  │ difficulty       │       └──────────────────┘                           │
│  │ options (JSON)   │                │                                      │
│  │ correctAnswers   │                │ createdBy/approvedBy                 │
│  │ explanation      │◀───────────────┘                                      │
│  │ status           │                                                       │
│  │ version          │                                                       │
│  │ createdAt        │                                                       │
│  │ updatedAt        │                                                       │
│  │ archivedAt       │                                                       │
│  │ createdById (FK) │                                                       │
│  │ approvedById(FK) │                                                       │
│  │ approvedAt       │                                                       │
│  └──────────────────┘                                                       │
│         ▲                                                                    │
│         │ (Phase 2 NEW) FK examTypeId                                       │
│         │                                                                    │
│  ┌──────────────────────────┐    ┌──────────────────────────┐              │
│  │        User (NEW)        │    │   ExamAttempt (NEW)      │              │
│  ├──────────────────────────┤    ├──────────────────────────┤              │
│  │ id (PK, UUID)            │◀───│ id (PK, UUID)            │              │
│  │ googleId (UNIQUE)        │    │ userId (FK, nullable)    │◀─────────┐  │
│  │ email                    │    │ examTypeId (FK)          │          │  │
│  │ oauthToken               │    │ score (0-100)            │          │  │
│  │ createdAt                │    │ passed (boolean)         │          │  │
│  │ lastLoginAt              │    │ duration (seconds)       │          │  │
│  │ updatedAt                │    │ submittedAt              │          │  │
│  └──────────────────────────┘    │ syncStatus (ENUM)        │          │  │
│                                  │ syncedAt                 │          │  │
│                                  │ syncRetries (int)        │          │  │
│                                  │ createdAt                │          │  │
│                                  │ updatedAt                │          │  │
│                                  └──────────────────────────┘          │  │
│                                                                        │  │
│                                   (User can have many ExamAttempts)   │  │
│                                                                        │  │
│  ┌──────────────────────────┐ (NEW - Mobile SQLite)                  │  │
│  │   OfflineQueue (SQLite)  │                                        │  │
│  ├──────────────────────────┤                                        │  │
│  │ id (PK)                  │                                        │  │
│  │ examAttemptId (UUID)     │────────────────────────────────────────┘  │
│  │ payload (JSON)           │   Mobile exam waiting for sync             │
│  │ createdAt                │                                            │
│  │ retryCount               │                                            │
│  │ nextRetryAt              │                                            │
│  │ lastError                │                                            │
│  └──────────────────────────┘                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

Note: Phase 1 (Question, Admin) stores question bank content.
Phase 2 (User, ExamAttempt) adds authentication and exam persistence.
SyncStatus: pending = queued locally, synced = on backend, failed = backend error.
```

### Prisma Schema

```prisma
// api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum QuestionType {
  SINGLE_CHOICE
  MULTIPLE_CHOICE
  TRUE_FALSE
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum QuestionStatus {
  DRAFT
  PENDING
  APPROVED
  ARCHIVED
}

// Multi-tenant exam type (e.g., AWS CCP, Solutions Architect)
model ExamType {
  id            String     @id                    // e.g., "aws-ccp", "aws-saa"
  name          String                            // e.g., "AWS Cloud Practitioner"
  displayName   String                            // e.g., "AWS CCP"
  description   String?
  domains       Json                              // [{id, name, weight, questionCount}]
  passingScore  Int        @default(70)           // Percentage (0-100)
  timeLimit     Int        @default(90)           // Minutes
  questionCount Int        @default(65)           // Questions per exam
  isActive      Boolean    @default(true)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  questions     Question[]
  syncVersions  SyncVersion[]
}

model Admin {
  id           String     @id @default(uuid())
  email        String     @unique
  passwordHash String
  name         String
  createdAt    DateTime   @default(now())

  createdQuestions  Question[] @relation("CreatedBy")
  approvedQuestions Question[] @relation("ApprovedBy")
}

model Question {
  id             String         @id @default(uuid())
  examTypeId     String                              // FK to ExamType
  text           String
  type           QuestionType
  domain         String                              // Domain ID from ExamType.domains
  difficulty     Difficulty
  options        Json           // [{id: string, text: string}]
  correctAnswers String[]       // Array of option IDs
  explanation    String
  status         QuestionStatus @default(DRAFT)
  version        Int            @default(1)

  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  archivedAt     DateTime?
  approvedAt     DateTime?

  examType       ExamType       @relation(fields: [examTypeId], references: [id])
  createdBy      Admin?         @relation("CreatedBy", fields: [createdById], references: [id])
  createdById    String?
  approvedBy     Admin?         @relation("ApprovedBy", fields: [approvedById], references: [id])
  approvedById   String?

  @@index([examTypeId])
  @@index([domain])
  @@index([status])
  @@index([version])
  @@index([examTypeId, status])
}

// Tracks sync version per exam type (multi-tenant)
model SyncVersion {
  id         Int      @id @default(autoincrement())
  examTypeId String   @unique
  version    Int      @default(1)
  updatedAt  DateTime @updatedAt

  examType   ExamType @relation(fields: [examTypeId], references: [id])
}
```

### ExamType.domains JSON Structure

```json
[
  {
    "id": "cloud-concepts",
    "name": "Cloud Concepts",
    "weight": 24,
    "questionCount": 16
  },
  {
    "id": "security",
    "name": "Security and Compliance",
    "weight": 30,
    "questionCount": 20
  },
  {
    "id": "technology",
    "name": "Technology",
    "weight": 34,
    "questionCount": 22
  },
  {
    "id": "billing",
    "name": "Billing and Pricing",
    "weight": 12,
    "questionCount": 7
  }
]
```

### Backend Validation Rules

| Field          | Rule                                       |
| -------------- | ------------------------------------------ |
| text           | Min 20 characters                          |
| explanation    | Min 50 characters                          |
| options        | Min 4 options (for choice types)           |
| correctAnswers | Single-choice: exactly 1; Multiple: 2+     |
| status         | Only APPROVED questions served to mobile   |
| domain         | Must match a domain ID in ExamType.domains |

---

## Mobile Local Storage (SQLite)

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOCAL STORAGE (SQLite)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐    │
│  │   Question   │       │   ExamAttempt    │       │ PracticeSession  │    │
│  ├──────────────┤       ├──────────────────┤       ├──────────────────┤    │
│  │ id (PK)      │       │ id (PK)          │       │ id (PK)          │    │
│  │ text         │       │ startedAt        │       │ startedAt        │    │
│  │ type         │       │ completedAt      │       │ completedAt      │    │
│  │ domain       │       │ status           │       │ domain           │    │
│  │ difficulty   │       │ score            │       │ difficulty       │    │
│  │ options      │       │ passed           │       │ questionsCount   │    │
│  │ correctAnsw  │       │ remainingTime    │       │ correctCount     │    │
│  │ explanation  │───┐   └────────┬─────────┘       └────────┬─────────┘    │
│  │ version      │   │            │                          │              │
│  └──────────────┘   │            │ 1:N                      │ 1:N          │
│                     │            ▼                          ▼              │
│                     │   ┌──────────────────┐       ┌──────────────────┐    │
│                     │   │   ExamAnswer     │       │ PracticeAnswer   │    │
│                     │   ├──────────────────┤       ├──────────────────┤    │
│                     └──▶│ id (PK)          │◀──────│ id (PK)          │    │
│                         │ examAttemptId(FK)│       │ sessionId (FK)   │    │
│                         │ questionId (FK)  │       │ questionId (FK)  │    │
│                         │ selectedAnswers  │       │ selectedAnswers  │    │
│                         │ isCorrect        │       │ isCorrect        │    │
│                         │ isFlagged        │       │ answeredAt       │    │
│                         │ orderIndex       │       └──────────────────┘    │
│                         └──────────────────┘                               │
│                                                                             │
│  ┌──────────────────┐       ┌──────────────────┐                           │
│  │    SyncMeta      │       │   UserStats      │                           │
│  ├──────────────────┤       ├──────────────────┤                           │
│  │ key (PK)         │       │ id (PK)          │                           │
│  │ value            │       │ totalExams       │                           │
│  │ updatedAt        │       │ totalPractice    │                           │
│  └──────────────────┘       │ totalQuestions   │                           │
│                             │ totalTimeSpent   │                           │
│                             │ lastActivityAt   │                           │
│                             └──────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Entities

### Question

Represents an individual exam question. Synced from cloud API.

| Field          | Type    | Constraints            | Description                                           |
| -------------- | ------- | ---------------------- | ----------------------------------------------------- |
| id             | TEXT    | PK                     | UUID from server                                      |
| text           | TEXT    | NOT NULL, MIN 20 chars | Question text                                         |
| type           | TEXT    | NOT NULL, ENUM         | 'single-choice', 'multiple-choice', 'true-false'      |
| domain         | TEXT    | NOT NULL, ENUM         | 'cloud-concepts', 'security', 'technology', 'billing' |
| difficulty     | TEXT    | NOT NULL, ENUM         | 'easy', 'medium', 'hard'                              |
| options        | TEXT    | NOT NULL, JSON         | Array of {id, text} objects                           |
| correctAnswers | TEXT    | NOT NULL, JSON         | Array of option IDs                                   |
| explanation    | TEXT    | NOT NULL, MIN 50 chars | Explanation of correct answer                         |
| version        | INTEGER | NOT NULL               | Sync version number                                   |
| createdAt      | TEXT    | NOT NULL               | ISO timestamp                                         |
| updatedAt      | TEXT    | NOT NULL               | ISO timestamp                                         |

**Indexes**: domain, difficulty, version

**Validation Rules**:

- Single-choice: exactly 1 correct answer
- Multiple-choice: 2+ correct answers
- True-false: exactly 2 options
- All types: minimum 3 distractors (wrong options)

---

### ExamAttempt

Represents a complete timed exam session.

| Field           | Type    | Constraints          | Description                                         |
| --------------- | ------- | -------------------- | --------------------------------------------------- |
| id              | TEXT    | PK                   | UUID generated locally                              |
| startedAt       | TEXT    | NOT NULL             | ISO timestamp when exam started                     |
| completedAt     | TEXT    | NULL                 | ISO timestamp when exam ended (null if in-progress) |
| status          | TEXT    | NOT NULL, ENUM       | 'in-progress', 'completed', 'abandoned'             |
| score           | REAL    | NULL                 | Percentage score (0-100), null if not completed     |
| passed          | INTEGER | NULL                 | 1 = passed, 0 = failed, null if not completed       |
| totalQuestions  | INTEGER | NOT NULL, DEFAULT 65 | Number of questions in exam                         |
| remainingTimeMs | INTEGER | NOT NULL             | Remaining time in milliseconds                      |
| expiresAt       | TEXT    | NOT NULL             | ISO timestamp (startedAt + 24 hours)                |

**Indexes**: status, startedAt

**State Transitions**:

- in-progress → completed (user submits or time expires)
- in-progress → abandoned (expiry time passed)

---

### ExamAnswer

Represents a user's answer to a question within an exam.

| Field           | Type    | Constraints                   | Description                                        |
| --------------- | ------- | ----------------------------- | -------------------------------------------------- |
| id              | TEXT    | PK                            | UUID generated locally                             |
| examAttemptId   | TEXT    | FK → ExamAttempt.id, NOT NULL | Parent exam                                        |
| questionId      | TEXT    | FK → Question.id, NOT NULL    | Question answered                                  |
| selectedAnswers | TEXT    | JSON                          | Array of selected option IDs (empty if unanswered) |
| isCorrect       | INTEGER | NULL                          | 1 = correct, 0 = incorrect, null if unanswered     |
| isFlagged       | INTEGER | NOT NULL, DEFAULT 0           | 1 = flagged for review                             |
| orderIndex      | INTEGER | NOT NULL                      | Position in exam (0-64)                            |
| answeredAt      | TEXT    | NULL                          | ISO timestamp when answered                        |

**Indexes**: examAttemptId, questionId
**Unique**: (examAttemptId, questionId)

---

### PracticeSession

Represents a practice study session.

| Field          | Type    | Constraints         | Description                                  |
| -------------- | ------- | ------------------- | -------------------------------------------- |
| id             | TEXT    | PK                  | UUID generated locally                       |
| startedAt      | TEXT    | NOT NULL            | ISO timestamp                                |
| completedAt    | TEXT    | NULL                | ISO timestamp (null if abandoned)            |
| domain         | TEXT    | NULL                | Filter: domain (null = all domains)          |
| difficulty     | TEXT    | NULL                | Filter: difficulty (null = all difficulties) |
| questionsCount | INTEGER | NOT NULL, DEFAULT 0 | Total questions answered                     |
| correctCount   | INTEGER | NOT NULL, DEFAULT 0 | Correct answers                              |

**Indexes**: startedAt, domain

---

### PracticeAnswer

Represents a user's answer within a practice session.

| Field           | Type    | Constraints                       | Description                  |
| --------------- | ------- | --------------------------------- | ---------------------------- |
| id              | TEXT    | PK                                | UUID generated locally       |
| sessionId       | TEXT    | FK → PracticeSession.id, NOT NULL | Parent session               |
| questionId      | TEXT    | FK → Question.id, NOT NULL        | Question answered            |
| selectedAnswers | TEXT    | JSON                              | Array of selected option IDs |
| isCorrect       | INTEGER | NOT NULL                          | 1 = correct, 0 = incorrect   |
| answeredAt      | TEXT    | NOT NULL                          | ISO timestamp                |

**Indexes**: sessionId, questionId

---

### SyncMeta

Key-value store for sync state.

| Field     | Type | Constraints | Description    |
| --------- | ---- | ----------- | -------------- |
| key       | TEXT | PK          | Metadata key   |
| value     | TEXT | NOT NULL    | Metadata value |
| updatedAt | TEXT | NOT NULL    | ISO timestamp  |

**Reserved Keys**:

- `lastSyncVersion`: Last synced question bank version
- `lastSyncAt`: ISO timestamp of last successful sync
- `bundledVersion`: Version of bundled question bank

---

### UserStats

Aggregated user statistics (single row, updated on activity).

| Field            | Type    | Constraints         | Description              |
| ---------------- | ------- | ------------------- | ------------------------ |
| id               | INTEGER | PK, DEFAULT 1       | Always 1 (single row)    |
| totalExams       | INTEGER | NOT NULL, DEFAULT 0 | Completed exams count    |
| totalPractice    | INTEGER | NOT NULL, DEFAULT 0 | Practice sessions count  |
| totalQuestions   | INTEGER | NOT NULL, DEFAULT 0 | Total questions answered |
| totalTimeSpentMs | INTEGER | NOT NULL, DEFAULT 0 | Total study time in ms   |
| lastActivityAt   | TEXT    | NULL                | Last activity timestamp  |

---

# Phase 2 Data Model: Authentication & Cloud Sync (NEW)

## Backend Entities (Prisma / PostgreSQL)

### User (NEW - Phase 2)

Cloud-backed user identity linked to Google OAuth.

| Field | Type | Constraints | Notes |
|-------|------|-----------|-------|
| **id** | UUID | PK, auto-generated | User primary key |
| **googleId** | STRING | UNIQUE, NOT NULL | Google account ID from OAuth |
| **email** | STRING | UNIQUE, NOT NULL | User email from Google account |
| **name** | STRING | NULL | User name from Google account |
| **oauthToken** | STRING | NULL | Refresh token (encrypted in storage) |
| **jwtToken** | STRING | NULL | Current JWT if cached (optional) |
| **createdAt** | TIMESTAMP | NOT NULL, auto-generated | Account creation timestamp |
| **updatedAt** | TIMESTAMP | NOT NULL, auto-updated | Last update timestamp |
| **lastLoginAt** | TIMESTAMP | NULL | Last successful login time |

**Indexes**: googleId, email, createdAt

**Relationships**: User ← ExamAttempt (1-to-many, userId FK)

**Validation**:
- googleId must be 21-chars alphanumeric (Google standard)
- email must match email format
- createdAt must be in ISO 8601 format

**Notes**:
- User is optional for backward compatibility (unsigned users have no User record)
- User creation happens on first Google sign-in (POST `/auth/google/callback`)

### ExamAttempt (UPDATED - Phase 2 Extension)

Extended to support cloud sync and user tracking.

| Field | Type | Constraints | Notes |
|-------|------|-----------|-------|
| **id** | UUID | PK, auto-generated | Exam attempt primary key |
| **examTypeId** | STRING | FK → ExamType.id, NOT NULL | Exam type identifier |
| **userId** | UUID | FK → User.id, NULL | User who took exam (NULL if unsigned) |
| **startedAt** | TIMESTAMP | NOT NULL | Exam start time |
| **submittedAt** | TIMESTAMP | NULL | Exam submission time (NULL if in-progress) |
| **expiresAt** | TIMESTAMP | NOT NULL | Time limit expiration |
| **status** | ENUM | 'in-progress', 'completed', 'abandoned' | Current exam status |
| **score** | INTEGER | NULL, 0-100 | Exam score percentage |
| **passed** | BOOLEAN | NULL | Whether user passed (NULL if not completed) |
| **syncStatus** | ENUM | 'pending', 'synced', 'failed' | Cloud sync status (NEW) |
| **syncedAt** | TIMESTAMP | NULL | When exam was synced to cloud (NEW) |
| **syncRetries** | INTEGER | DEFAULT 0 | Number of failed sync attempts (NEW) |

**Indexes**: userId, examTypeId, submittedAt, syncStatus

**Relationships**:
- ExamAttempt ← ExamAnswer (1-to-many)
- ExamAttempt ← User (many-to-1)

**Validation**:
- submittedAt >= startedAt
- expiresAt > startedAt
- score between 0-100 if status='completed'
- syncStatus must be one of enum values

**Notes**:
- userId is nullable for backward compatibility (Phase 1 exams have no userId)
- syncStatus tracks whether exam was posted to `/exam-attempts` endpoint
- syncRetries incremented on each failed POST attempt

---

## Mobile Entities (SQLite Extensions - Phase 2)

### OfflineQueue (NEW - Phase 2)

Tracks exam submissions pending cloud sync.

| Field | Type | Constraints | Notes |
|-------|------|-----------|-------|
| **id** | TEXT | PK, auto-generated | Queue entry primary key |
| **examAttemptId** | TEXT | FK → ExamAttempt.id, NOT NULL | Exam to sync |
| **status** | ENUM | 'pending', 'in-progress', 'synced', 'failed' | Sync attempt status |
| **payload** | JSON | NOT NULL | ExamAttempt data to POST |
| **error** | TEXT | NULL | Last error message |
| **retries** | INTEGER | DEFAULT 0 | Number of sync attempts |
| **nextRetryAt** | TIMESTAMP | NULL | When to retry (exponential backoff) |
| **createdAt** | TIMESTAMP | NOT NULL, auto-generated | Queue entry creation |
| **updatedAt** | TIMESTAMP | NOT NULL, auto-updated | Last update |
| **syncedAt** | TIMESTAMP | NULL | When successfully synced |

**Indexes**: examAttemptId, status, nextRetryAt

**Validation**:
- payload must contain examAttemptId, score, passed, answers (JSON serialized)
- retries must be >= 0
- nextRetryAt must be >= now()

**Lifecycle**:
1. User completes exam → OfflineQueue entry created with `status: pending`
2. If online → POST to `/exam-attempts` immediately, set `status: synced`, record syncedAt
3. If offline → Wait for connectivity, try again
4. On failure → Exponential backoff (1s, 2s, 4s, 8s, 16s, 32s), nextRetryAt updated
5. After max retries (12, ~63 min window) → `status: failed`, notify user
6. User can retry manually from History screen → resets retries counter

---

## Domain Enums

### QuestionType

```typescript
type QuestionType = 'single-choice' | 'multiple-choice' | 'true-false';
```

### Domain

```typescript
type Domain = 'cloud-concepts' | 'security' | 'technology' | 'billing';

const DOMAIN_LABELS: Record<Domain, string> = {
  'cloud-concepts': 'Cloud Concepts',
  security: 'Security and Compliance',
  technology: 'Technology',
  billing: 'Billing and Pricing',
};

const DOMAIN_WEIGHTS: Record<Domain, number> = {
  'cloud-concepts': 0.24, // 15-16 questions
  security: 0.3, // 19-20 questions
  technology: 0.34, // 22-23 questions
  billing: 0.12, // 7-8 questions
};
```

### Difficulty

```typescript
type Difficulty = 'easy' | 'medium' | 'hard';
```

### ExamStatus

```typescript
type ExamStatus = 'in-progress' | 'completed' | 'abandoned';
```

## Computed Values

### Exam Score Calculation

```typescript
const calculateScore = (answers: ExamAnswer[]): number => {
  const answered = answers.filter((a) => a.selectedAnswers.length > 0);
  const correct = answered.filter((a) => a.isCorrect).length;
  return (correct / 65) * 100; // Always out of 65 total
};
```

### Domain Performance

```typescript
interface DomainPerformance {
  domain: Domain;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  strength: 'strong' | 'moderate' | 'weak';
}

const getStrength = (pct: number): 'strong' | 'moderate' | 'weak' => {
  if (pct >= 80) return 'strong';
  if (pct >= 70) return 'moderate';
  return 'weak';
};
```

## Migration Strategy

1. **v1 (Initial)**: Create all tables as defined above
2. **Future migrations**: Add version column to schema, apply migrations on app launch

## Data Lifecycle

| Data            | Retention       | Deletion Trigger          |
| --------------- | --------------- | ------------------------- |
| Questions       | Until next sync | Replaced by newer version |
| ExamAttempt     | Forever         | App uninstall only        |
| PracticeSession | Forever         | App uninstall only        |
| SyncMeta        | Forever         | App uninstall only        |
| UserStats       | Forever         | App uninstall only        |

## Offline Behavior

- All entities stored in SQLite; no network required for CRUD
- Questions pre-bundled in app; sync adds/updates only
- ExamAttempt.expiresAt checked on app launch; expired → abandoned

## Implementation Status (February 15, 2026)

### ✅ Backend Schema (PostgreSQL + Prisma)

| Entity | Status | Fields | Location |
|--------|--------|--------|----------|
| **ExamType** | ✅ | id, name, domains (JSON), passingScore, timeLimit | api/prisma/schema.prisma |
| **Question** | ✅ | id, examTypeId, text, type, domain, difficulty, options (JSON), status | api/prisma/schema.prisma |
| **Admin** | ✅ | id, email, passwordHash | api/prisma/schema.prisma |
| **SyncVersion** | ✅ | examTypeId, version, updatedAt | api/prisma/schema.prisma |
| **User** | 📋 NEW (Phase 2) | id, googleId, email, name, oauthToken, createdAt, updatedAt, lastLoginAt | api/prisma/schema.prisma |
| **User** | ✅ | id (device-local) | implicit in mobile storage |
| **ExamAttempt** | ✅ | id, examTypeId, startedAt, submittedAt, status, expiresAt | mobile SQLite |
| **ExamAttempt** | 📋 UPDATED (Phase 2) | **NEW**: userId (FK), syncStatus, syncedAt, syncRetries | mobile SQLite + api/prisma/schema.prisma |
| **ExamAnswer** | ✅ | id, examAttemptId, questionId, selectedOptions, isFlagged | mobile SQLite |
| **PracticeSession** | ✅ | id, startedAt, endedAt, domain, difficulty | mobile SQLite |
| **PracticeAnswer** | ✅ | id, sessionId, questionId, selectedOptions | mobile SQLite |
| **UserStats** | ✅ | id, totalExamsCompleted, totalQuestionsAnswered, totalTimeSpent | mobile SQLite |
| **OfflineQueue** | 📋 NEW (Phase 2) | id, examAttemptId, status, payload (JSON), error, retries, nextRetryAt, createdAt, synced At | mobile SQLite |

### ✅ Database Migrations

| Migration | Status | Details |
|-----------|--------|---------|
| **20260212070024_init** | ✅ Applied | Initial schema with ExamType, Question, Admin, SyncVersion models |

### ✅ Repositories Implemented

**Mobile (SQLite)**:
- QuestionRepository (T034)
- ExamAttemptRepository (T035)
- ExamAnswerRepository (T036)
- PracticeSessionRepository (T049)
- PracticeAnswerRepository (T050)
- UserStatsRepository (T066)

**Backend (Prisma)**:
- PrismaService with CRUD operations
- Implicit repositories through service layer

### ✅ Relationships Verified

- ExamType ← Question (1-to-many, examTypeId FK)
- ExamAttempt ← ExamAnswer (1-to-many)
- PracticeSession ← PracticeAnswer (1-to-many)
- All foreign keys implemented with proper constraints
