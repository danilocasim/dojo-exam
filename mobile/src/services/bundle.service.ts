// Bundle loader - loads initial question bank from bundled assets
import { getDatabase, QuestionRow, SYNC_META_KEYS } from '../storage';

// Import bundled questions
import awsCcpBundle from '../../assets/questions/aws-ccp-bundle.json';

/**
 * Bundled question structure (matches the JSON format)
 */
interface BundledQuestion {
  id: string;
  text: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  domain: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  options: Array<{ id: string; text: string }>;
  correctAnswers: string[];
  explanation: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Bundled question bank structure
 */
interface QuestionBundle {
  version: number;
  examTypeId: string;
  generatedAt: string;
  questions: BundledQuestion[];
}

/**
 * Check if bundled questions have been loaded
 */
export const isBundleLoaded = async (): Promise<boolean> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM SyncMeta WHERE key = ?',
    [SYNC_META_KEYS.BUNDLED_VERSION],
  );
  return row !== null;
};

/**
 * Get the bundled version that was loaded
 */
export const getBundledVersion = async (): Promise<number | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM SyncMeta WHERE key = ?',
    [SYNC_META_KEYS.BUNDLED_VERSION],
  );
  return row ? parseInt(row.value, 10) : null;
};

/**
 * Load bundled questions into the database
 * This is called on first app launch to provide offline-first functionality
 */
export const loadBundledQuestions = async (): Promise<{
  loaded: boolean;
  count: number;
}> => {
  // Check if already loaded
  if (await isBundleLoaded()) {
    return { loaded: false, count: 0 };
  }

  const db = await getDatabase();
  const bundle = awsCcpBundle as QuestionBundle;

  // Insert each question
  for (const q of bundle.questions) {
    const row: QuestionRow = {
      id: q.id,
      text: q.text,
      type: q.type,
      domain: q.domain,
      difficulty: q.difficulty,
      options: JSON.stringify(q.options),
      correctAnswers: JSON.stringify(q.correctAnswers),
      explanation: q.explanation,
      version: q.version,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    };

    await db.runAsync(
      `INSERT OR IGNORE INTO Question 
        (id, text, type, domain, difficulty, options, correctAnswers, explanation, version, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.text,
        row.type,
        row.domain,
        row.difficulty,
        row.options,
        row.correctAnswers,
        row.explanation,
        row.version,
        row.createdAt,
        row.updatedAt,
      ],
    );
  }

  // Mark bundle as loaded
  const now = new Date().toISOString();
  await db.runAsync(`INSERT OR REPLACE INTO SyncMeta (key, value, updatedAt) VALUES (?, ?, ?)`, [
    SYNC_META_KEYS.BUNDLED_VERSION,
    String(bundle.version),
    now,
  ]);

  // If no sync has occurred yet, set the last sync version to bundle version
  const lastSyncRow = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM SyncMeta WHERE key = ?',
    [SYNC_META_KEYS.LAST_SYNC_VERSION],
  );

  if (!lastSyncRow) {
    await db.runAsync(`INSERT OR REPLACE INTO SyncMeta (key, value, updatedAt) VALUES (?, ?, ?)`, [
      SYNC_META_KEYS.LAST_SYNC_VERSION,
      String(bundle.version),
      now,
    ]);
  }

  return { loaded: true, count: bundle.questions.length };
};

/**
 * Get question count in database
 */
export const getQuestionCount = async (): Promise<number> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Question');
  return row?.count ?? 0;
};
