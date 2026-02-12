// SQLite database initialization
import * as SQLite from 'expo-sqlite';

// Database instance (singleton)
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create the SQLite database instance
 */
export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync('dojoexam.db');
  return db;
};

/**
 * Initialize the database schema
 * Creates all tables if they don't exist
 */
export const initializeDatabase = async (): Promise<void> => {
  const database = await getDatabase();

  // Enable foreign keys
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Create Question table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS Question (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE')),
      domain TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
      options TEXT NOT NULL,
      correctAnswers TEXT NOT NULL,
      explanation TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_question_domain ON Question(domain);
    CREATE INDEX IF NOT EXISTS idx_question_difficulty ON Question(difficulty);
    CREATE INDEX IF NOT EXISTS idx_question_version ON Question(version);
  `);

  // Create ExamAttempt table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ExamAttempt (
      id TEXT PRIMARY KEY,
      startedAt TEXT NOT NULL,
      completedAt TEXT,
      status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed', 'abandoned')) DEFAULT 'in-progress',
      score REAL,
      passed INTEGER,
      totalQuestions INTEGER NOT NULL DEFAULT 65,
      remainingTimeMs INTEGER NOT NULL,
      expiresAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_exam_attempt_status ON ExamAttempt(status);
    CREATE INDEX IF NOT EXISTS idx_exam_attempt_started_at ON ExamAttempt(startedAt);
  `);

  // Create ExamAnswer table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ExamAnswer (
      id TEXT PRIMARY KEY,
      examAttemptId TEXT NOT NULL,
      questionId TEXT NOT NULL,
      selectedAnswers TEXT NOT NULL DEFAULT '[]',
      isCorrect INTEGER,
      isFlagged INTEGER NOT NULL DEFAULT 0,
      orderIndex INTEGER NOT NULL,
      answeredAt TEXT,
      FOREIGN KEY (examAttemptId) REFERENCES ExamAttempt(id) ON DELETE CASCADE,
      FOREIGN KEY (questionId) REFERENCES Question(id),
      UNIQUE (examAttemptId, questionId)
    );
    CREATE INDEX IF NOT EXISTS idx_exam_answer_attempt ON ExamAnswer(examAttemptId);
    CREATE INDEX IF NOT EXISTS idx_exam_answer_question ON ExamAnswer(questionId);
  `);

  // Create PracticeSession table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS PracticeSession (
      id TEXT PRIMARY KEY,
      startedAt TEXT NOT NULL,
      completedAt TEXT,
      domain TEXT,
      difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('EASY', 'MEDIUM', 'HARD')),
      questionsCount INTEGER NOT NULL DEFAULT 0,
      correctCount INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_practice_session_started_at ON PracticeSession(startedAt);
    CREATE INDEX IF NOT EXISTS idx_practice_session_domain ON PracticeSession(domain);
  `);

  // Create PracticeAnswer table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS PracticeAnswer (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      questionId TEXT NOT NULL,
      selectedAnswers TEXT NOT NULL DEFAULT '[]',
      isCorrect INTEGER NOT NULL,
      answeredAt TEXT NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES PracticeSession(id) ON DELETE CASCADE,
      FOREIGN KEY (questionId) REFERENCES Question(id)
    );
    CREATE INDEX IF NOT EXISTS idx_practice_answer_session ON PracticeAnswer(sessionId);
    CREATE INDEX IF NOT EXISTS idx_practice_answer_question ON PracticeAnswer(questionId);
  `);

  // Create SyncMeta table (key-value store)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS SyncMeta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Create UserStats table (single row)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS UserStats (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      totalExams INTEGER NOT NULL DEFAULT 0,
      totalPractice INTEGER NOT NULL DEFAULT 0,
      totalQuestions INTEGER NOT NULL DEFAULT 0,
      totalTimeSpentMs INTEGER NOT NULL DEFAULT 0,
      lastActivityAt TEXT
    );
    INSERT OR IGNORE INTO UserStats (id) VALUES (1);
  `);
};

/**
 * Close the database connection
 */
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};

/**
 * Reset the database (drop all tables and reinitialize)
 * WARNING: This deletes all data!
 */
export const resetDatabase = async (): Promise<void> => {
  const database = await getDatabase();

  await database.execAsync(`
    DROP TABLE IF EXISTS PracticeAnswer;
    DROP TABLE IF EXISTS PracticeSession;
    DROP TABLE IF EXISTS ExamAnswer;
    DROP TABLE IF EXISTS ExamAttempt;
    DROP TABLE IF EXISTS Question;
    DROP TABLE IF EXISTS SyncMeta;
    DROP TABLE IF EXISTS UserStats;
  `);

  await initializeDatabase();
};
