# Quickstart: CloudPrep Mobile

**Feature**: 002-cloudprep-mobile  
**Date**: February 12, 2026

## Prerequisites

- Node.js 18+ and npm 9+
- Android Studio with SDK 24+ (Android 7.0+)
- Expo CLI: `npm install -g expo-cli`
- Android emulator or physical device

## Project Setup

### 1. Initialize Mobile App

```bash
# Create Expo project with TypeScript template
npx create-expo-app@latest app --template expo-template-blank-typescript

cd app

# Install core dependencies
npx expo install expo-sqlite expo-crypto react-native-async-storage
npm install @react-navigation/native @react-navigation/native-stack
npm install zustand axios
npm install nativewind tailwindcss

# Install dev dependencies
npm install -D @types/react jest @testing-library/react-native
npm install -D detox jest-circus
```

### 2. Initialize API Server

```bash
cd ../
mkdir api && cd api

npm init -y
npm install express cors helmet
npm install -D typescript @types/express @types/node ts-node nodemon
npm install -D jest @types/jest ts-jest

# Create tsconfig.json
npx tsc --init
```

### 3. Configure NativeWind

```bash
cd ../app

# Create tailwind.config.js
npx tailwindcss init
```

Edit `tailwind.config.js`:
```javascript
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

### 4. Create Directory Structure

```bash
cd ../app

mkdir -p src/{components,screens,services,stores,models,utils,navigation}
mkdir -p src/components/{questions,navigation,analytics}
mkdir -p src/services/{exam,practice,storage,sync}
mkdir -p __tests__/{unit,integration}
```

## Database Schema

Create `src/services/storage/schema.ts`:

```typescript
export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    domain TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    options TEXT NOT NULL,
    correctAnswers TEXT NOT NULL,
    explanation TEXT NOT NULL,
    version INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exam_attempts (
    id TEXT PRIMARY KEY,
    startedAt TEXT NOT NULL,
    completedAt TEXT,
    status TEXT NOT NULL DEFAULT 'in-progress',
    score REAL,
    passed INTEGER,
    totalQuestions INTEGER NOT NULL DEFAULT 65,
    remainingTimeMs INTEGER NOT NULL,
    expiresAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exam_answers (
    id TEXT PRIMARY KEY,
    examAttemptId TEXT NOT NULL,
    questionId TEXT NOT NULL,
    selectedAnswers TEXT NOT NULL DEFAULT '[]',
    isCorrect INTEGER,
    isFlagged INTEGER NOT NULL DEFAULT 0,
    orderIndex INTEGER NOT NULL,
    answeredAt TEXT,
    FOREIGN KEY (examAttemptId) REFERENCES exam_attempts(id),
    FOREIGN KEY (questionId) REFERENCES questions(id),
    UNIQUE (examAttemptId, questionId)
  );

  CREATE TABLE IF NOT EXISTS practice_sessions (
    id TEXT PRIMARY KEY,
    startedAt TEXT NOT NULL,
    completedAt TEXT,
    domain TEXT,
    difficulty TEXT,
    questionsCount INTEGER NOT NULL DEFAULT 0,
    correctCount INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS practice_answers (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    questionId TEXT NOT NULL,
    selectedAnswers TEXT NOT NULL,
    isCorrect INTEGER NOT NULL,
    answeredAt TEXT NOT NULL,
    FOREIGN KEY (sessionId) REFERENCES practice_sessions(id),
    FOREIGN KEY (questionId) REFERENCES questions(id)
  );

  CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    totalExams INTEGER NOT NULL DEFAULT 0,
    totalPractice INTEGER NOT NULL DEFAULT 0,
    totalQuestions INTEGER NOT NULL DEFAULT 0,
    totalTimeSpentMs INTEGER NOT NULL DEFAULT 0,
    lastActivityAt TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_questions_domain ON questions(domain);
  CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
  CREATE INDEX IF NOT EXISTS idx_questions_version ON questions(version);
  CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
  CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON exam_answers(examAttemptId);
  CREATE INDEX IF NOT EXISTS idx_practice_answers_session ON practice_answers(sessionId);
`;
```

## Key Type Definitions

Create `src/models/types.ts`:

```typescript
export type QuestionType = 'single-choice' | 'multiple-choice' | 'true-false';
export type Domain = 'cloud-concepts' | 'security' | 'technology' | 'billing';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExamStatus = 'in-progress' | 'completed' | 'abandoned';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  domain: Domain;
  difficulty: Difficulty;
  options: { id: string; text: string }[];
  correctAnswers: string[];
  explanation: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamAttempt {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: ExamStatus;
  score: number | null;
  passed: boolean | null;
  totalQuestions: number;
  remainingTimeMs: number;
  expiresAt: string;
}

export interface ExamAnswer {
  id: string;
  examAttemptId: string;
  questionId: string;
  selectedAnswers: string[];
  isCorrect: boolean | null;
  isFlagged: boolean;
  orderIndex: number;
  answeredAt: string | null;
}

export const DOMAIN_LABELS: Record<Domain, string> = {
  'cloud-concepts': 'Cloud Concepts',
  'security': 'Security and Compliance',
  'technology': 'Technology',
  'billing': 'Billing and Pricing',
};

export const EXAM_CONFIG = {
  totalQuestions: 65,
  durationMs: 90 * 60 * 1000, // 90 minutes
  passingScore: 70,
  expiryHours: 24,
  domainQuotas: {
    'cloud-concepts': 16,
    'security': 20,
    'technology': 22,
    'billing': 7,
  },
} as const;
```

## Running the App

### Development

```bash
# Start the mobile app
cd app
npx expo start

# In another terminal, start API server
cd api
npm run dev
```

### Android Build

```bash
cd app
npx expo run:android
```

### Testing

```bash
# Unit tests
cd app
npm test

# E2E tests (requires running emulator)
npm run test:e2e
```

## Environment Configuration

Create `app/.env`:
```
API_URL=http://localhost:3000/v1
```

Create `app/.env.production`:
```
API_URL=https://api.cloudprep.app/v1
```

## Next Steps

1. Implement database service (`src/services/storage/database.ts`)
2. Create exam generation service (`src/services/exam/generator.ts`)
3. Build core screens (Home, Exam, Practice, Review, Analytics)
4. Add question bank sync service
5. Write tests for scoring and exam generation logic
