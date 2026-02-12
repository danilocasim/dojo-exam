// Zustand store exports

// Exam store (T040)
export {
  useExamStore,
  selectCurrentQuestion,
  selectCurrentAnswer,
  selectHasNextQuestion,
  selectHasPreviousQuestion,
  selectIsExamInProgress,
  selectTotalQuestions,
  selectProgressPercent,
  useHasInProgressExam,
} from './exam.store';
export type { ExamState, ExamActions, ExamStore } from './exam.store';
