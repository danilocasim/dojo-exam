# Data Model: AWS Cloud Practitioner Exam Simulator

**Feature Branch**: `001-aws-exam-simulator`
**Date**: 2026-02-12

---

## Overview

The data model spans two storage systems:
- **Mobile (SQLite via expo-sqlite)**: Local on-device storage for questions, exam sessions, practice sessions, and analytics
- **Backend (PostgreSQL via Drizzle ORM)**: Server-side storage for admin question management and sync

The mobile database is the source of truth for user data (exams, analytics). The backend database is the source of truth for question content. Sync flows one direction: backend -> mobile.

---

## Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────────┐
│      Question        │       │       AnswerOption       │
│─────────────────────│       │─────────────────────────│
│ id (PK)              │──1:N─→│ id (PK)                 │
│ text                 │       │ questionId (FK)          │
│ domain               │       │ text                     │
│ difficulty           │       │ isCorrect                │
│ questionType         │       │ displayOrder             │
│ explanation          │       │                          │
│ status               │       └─────────────────────────┘
│ requiredSelections   │
│ createdAt            │
│ updatedAt            │
│ version              │
└─────────────────────┘
         │
         │ (snapshot via examQuestionIds)
         ▼
┌─────────────────────┐       ┌─────────────────────────┐
│    ExamSession       │       │      ExamAnswer          │
│─────────────────────│       │─────────────────────────│
│ id (PK)              │──1:N─→│ id (PK)                 │
│ startedAt            │       │ examSessionId (FK)       │
│ completedAt          │       │ questionId (FK)          │
│ timeRemainingMs      │       │ selectedOptionIds (JSON) │
│ totalScore           │       │ isCorrect                │
│ scaledScore          │       │ isFlagged                │
│ passed               │       │ questionIndex            │
│ status               │       │                          │
│ domainScores (JSON)  │       └─────────────────────────┘
│ currentQuestionIndex │
│ questionIds (JSON)   │
└─────────────────────┘

┌─────────────────────┐       ┌─────────────────────────┐
│  PracticeSession     │       │    PracticeAnswer        │
│─────────────────────│       │─────────────────────────│
│ id (PK)              │──1:N─→│ id (PK)                 │
│ domainFilter         │       │ practiceSessionId (FK)   │
│ difficultyFilter     │       │ questionId (FK)          │
│ startedAt            │       │ selectedOptionIds (JSON) │
│ completedAt          │       │ isCorrect                │
│ totalQuestions       │       │                          │
│ correctCount         │       └─────────────────────────┘
│ accuracy             │
└─────────────────────┘

┌─────────────────────┐
│     SyncMetadata     │
│─────────────────────│
│ id (PK)              │
│ lastSyncTimestamp    │
│ checksum             │
│ schemaVersion        │
└─────────────────────┘
```

---

## Entity Definitions

### Question

The core content unit representing a single exam question.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT (UUID) | PK | Unique identifier, generated on backend |
| text | TEXT | NOT NULL | Question text (supports basic markdown for code blocks) |
| domain | TEXT | NOT NULL, CHECK IN ('cloud_concepts', 'security_compliance', 'cloud_technology', 'billing_pricing') | AWS exam domain |
| difficulty | TEXT | NOT NULL, CHECK IN ('easy', 'medium', 'hard') | Difficulty level |
| questionType | TEXT | NOT NULL, CHECK IN ('single_choice', 'multiple_choice', 'true_false') | Type of question |
| explanation | TEXT | NOT NULL | Detailed explanation of the correct answer |
| status | TEXT | NOT NULL, DEFAULT 'draft', CHECK IN ('draft', 'review', 'approved', 'archived') | Approval workflow status (backend only; mobile only stores 'approved') |
| requiredSelections | INTEGER | NOT NULL, DEFAULT 1 | Number of answers the user must select (1 for single/true-false, 2+ for multiple) |
| createdAt | TEXT (ISO8601) | NOT NULL | Creation timestamp |
| updatedAt | TEXT (ISO8601) | NOT NULL | Last modification timestamp |
| version | INTEGER | NOT NULL, DEFAULT 1 | Incrementing version for conflict detection |

**Indexes (mobile SQLite)**:
- `idx_question_domain` ON (domain) - Practice mode filtering
- `idx_question_difficulty` ON (difficulty) - Practice mode filtering
- `idx_question_domain_difficulty` ON (domain, difficulty) - Combined filtering

**Validation Rules**:
- `text` must be non-empty, max 2000 characters
- `explanation` must be non-empty, max 3000 characters
- `requiredSelections` must be >= 1 and <= number of correct answer options
- Each question must have at least 2 answer options
- Each question must have at least 1 correct answer option
- For `true_false` type: exactly 2 options, exactly 1 correct
- For `single_choice` type: exactly 4 options, exactly 1 correct
- For `multiple_choice` type: 4-6 options, `requiredSelections` correct answers

---

### AnswerOption

An individual answer choice belonging to a question.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT (UUID) | PK | Unique identifier |
| questionId | TEXT | FK -> Question.id, NOT NULL | Parent question |
| text | TEXT | NOT NULL | Answer option text |
| isCorrect | INTEGER (0/1) | NOT NULL | Whether this is a correct answer |
| displayOrder | INTEGER | NOT NULL | Display position (1-based) |

**Validation Rules**:
- `text` must be non-empty, max 1000 characters
- `displayOrder` must be unique within a question
- Total correct options must match `Question.requiredSelections`

---

### ExamSession

A complete exam attempt, from start to submission/expiry.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT (UUID) | PK | Unique identifier |
| startedAt | TEXT (ISO8601) | NOT NULL | When the exam was started |
| completedAt | TEXT (ISO8601) | NULLABLE | When the exam was submitted/expired (null if in progress) |
| timeRemainingMs | INTEGER | NOT NULL | Milliseconds remaining on timer (for resume) |
| totalScore | INTEGER | NULLABLE | Raw correct count (0-65) |
| scaledScore | INTEGER | NULLABLE | Scaled score (100-1000) |
| passed | INTEGER (0/1) | NULLABLE | Whether score >= 700 |
| status | TEXT | NOT NULL, CHECK IN ('in_progress', 'completed', 'expired') | Exam state |
| domainScores | TEXT (JSON) | NULLABLE | JSON object: `{"cloud_concepts": {"correct": 10, "total": 16, "percentage": 62.5}, ...}` |
| currentQuestionIndex | INTEGER | NOT NULL, DEFAULT 0 | Last viewed question position (for resume) |
| questionIds | TEXT (JSON) | NOT NULL | Ordered JSON array of question IDs for this exam instance |

**State Transitions**:
```
                ┌──────────────┐
  Start Exam    │              │   Timer expires
  ───────────→  │ in_progress  │ ───────────────→ expired
                │              │                  (auto-score)
                └──────┬───────┘
                       │
                       │ User submits
                       ▼
                ┌──────────────┐
                │  completed   │
                │  (scored)    │
                └──────────────┘
```

**Validation Rules**:
- `timeRemainingMs` must be >= 0 and <= 5400000 (90 minutes in ms)
- `scaledScore` must be between 100 and 1000 (when set)
- `questionIds` must contain exactly 65 entries
- Only one `in_progress` exam session allowed at a time

---

### ExamAnswer

A user's answer to a single question within an exam session.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT (UUID) | PK | Unique identifier |
| examSessionId | TEXT | FK -> ExamSession.id, NOT NULL | Parent exam session |
| questionId | TEXT | FK -> Question.id, NOT NULL | The question being answered |
| selectedOptionIds | TEXT (JSON) | NULLABLE | JSON array of selected AnswerOption.id values (null if unanswered) |
| isCorrect | INTEGER (0/1) | NULLABLE | Whether the answer is correct (computed on exam completion) |
| isFlagged | INTEGER (0/1) | NOT NULL, DEFAULT 0 | Whether user flagged for review |
| questionIndex | INTEGER | NOT NULL | Position in exam (0-based, for ordering) |

**Validation Rules**:
- Unique constraint on (examSessionId, questionId)
- Unique constraint on (examSessionId, questionIndex)
- `questionIndex` must be 0-64

---

### PracticeSession

A practice attempt with optional domain/difficulty filtering.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT (UUID) | PK | Unique identifier |
| domainFilter | TEXT | NULLABLE | Domain filter applied (null = all domains) |
| difficultyFilter | TEXT | NULLABLE | Difficulty filter applied (null = all difficulties) |
| startedAt | TEXT (ISO8601) | NOT NULL | Session start time |
| completedAt | TEXT (ISO8601) | NULLABLE | Session end time (null if abandoned) |
| totalQuestions | INTEGER | NOT NULL, DEFAULT 0 | Number of questions attempted |
| correctCount | INTEGER | NOT NULL, DEFAULT 0 | Number answered correctly |
| accuracy | REAL | NULLABLE | Percentage accuracy (0.0-100.0), computed on completion |

---

### PracticeAnswer

A user's answer to a single practice question.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT (UUID) | PK | Unique identifier |
| practiceSessionId | TEXT | FK -> PracticeSession.id, NOT NULL | Parent practice session |
| questionId | TEXT | FK -> Question.id, NOT NULL | The question answered |
| selectedOptionIds | TEXT (JSON) | NOT NULL | JSON array of selected AnswerOption.id values |
| isCorrect | INTEGER (0/1) | NOT NULL | Whether the answer was correct |

---

### SyncMetadata

Tracks question synchronization state between device and server.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PK, DEFAULT 1 | Singleton row (always id=1) |
| lastSyncTimestamp | TEXT (ISO8601) | NULLABLE | Last successful sync time (null = never synced) |
| checksum | TEXT | NULLABLE | Hash of question bank for integrity verification |
| schemaVersion | INTEGER | NOT NULL, DEFAULT 1 | Database schema version for migrations |

---

## Scoring Algorithm

### Raw Score Calculation
```
rawScore = count of questions where ExamAnswer.isCorrect = 1
totalQuestions = 65
```

### Scaled Score (100-1000)
```
scaledScore = 100 + round((rawScore / totalQuestions) * 900)
```

This maps:
- 0 correct -> 100
- 65 correct -> 1000
- ~46 correct (~70.8%) -> ~737 (pass)

### Pass/Fail
```
passed = scaledScore >= 700
```

### Per-Domain Scores
```
For each domain:
  domainCorrect = count correct answers for questions in domain
  domainTotal = count questions in domain
  domainPercentage = (domainCorrect / domainTotal) * 100
```

---

## Question Selection Algorithm (Exam Generation)

To generate a 65-question exam with proper domain weighting:

```
Target distribution (65 questions):
  cloud_concepts:    round(65 * 0.24) = 16 questions
  security_compliance: round(65 * 0.30) = 19 questions (adjusted +1)
  cloud_technology:  round(65 * 0.34) = 22 questions
  billing_pricing:   round(65 * 0.12) = 8 questions
  Total: 65

Algorithm:
1. For each domain, randomly select N approved questions (where N = target count)
2. If insufficient questions in a domain, use all available and redistribute remainder
3. Shuffle the final 65-question list
4. Store ordered questionIds in ExamSession for reproducibility
```

---

## Backend-Only Entities (PostgreSQL)

### AdminUser (backend only)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Auto-incrementing ID |
| apiKey | VARCHAR(64) | UNIQUE, NOT NULL | Hashed API key for authentication |
| name | VARCHAR(100) | NOT NULL | Admin display name |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

Note: For MVP with single admin, this table may be skipped in favor of environment variable API key. Include for future multi-admin support.

---

## SQLite Schema (Mobile)

```sql
-- Schema version tracking
CREATE TABLE IF NOT EXISTS sync_metadata (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_sync_timestamp TEXT,
  checksum TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1
);

-- Questions (synced from backend)
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('cloud_concepts', 'security_compliance', 'cloud_technology', 'billing_pricing')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false')),
  explanation TEXT NOT NULL,
  required_selections INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_question_domain ON questions(domain);
CREATE INDEX IF NOT EXISTS idx_question_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_domain_difficulty ON questions(domain, difficulty);

-- Answer options (synced from backend)
CREATE TABLE IF NOT EXISTS answer_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_answer_option_question ON answer_options(question_id);

-- Exam sessions (local only)
CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  time_remaining_ms INTEGER NOT NULL,
  total_score INTEGER,
  scaled_score INTEGER,
  passed INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'expired')),
  domain_scores TEXT,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  question_ids TEXT NOT NULL
);

-- Exam answers (local only)
CREATE TABLE IF NOT EXISTS exam_answers (
  id TEXT PRIMARY KEY,
  exam_session_id TEXT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  selected_option_ids TEXT,
  is_correct INTEGER,
  is_flagged INTEGER NOT NULL DEFAULT 0,
  question_index INTEGER NOT NULL,
  UNIQUE(exam_session_id, question_id),
  UNIQUE(exam_session_id, question_index)
);

CREATE INDEX IF NOT EXISTS idx_exam_answer_session ON exam_answers(exam_session_id);

-- Practice sessions (local only)
CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY,
  domain_filter TEXT,
  difficulty_filter TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  accuracy REAL
);

-- Practice answers (local only)
CREATE TABLE IF NOT EXISTS practice_answers (
  id TEXT PRIMARY KEY,
  practice_session_id TEXT NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  selected_option_ids TEXT NOT NULL,
  is_correct INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_answer_session ON practice_answers(practice_session_id);
```
