import type { AdminQuestion } from '../services/api';
import { colors, radius } from '../theme';

interface Props { question: AdminQuestion; onClick: () => void; }

const STATUS: Record<string, { bg: string; text: string }> = {
  DRAFT: colors.draft,
  PENDING: colors.pending,
  APPROVED: colors.approved,
  ARCHIVED: colors.archived,
};
const DIFF_COLOR: Record<string, string> = {
  EASY: colors.easy,
  MEDIUM: colors.medium,
  HARD: colors.hard,
};

export function QuestionCard({ question, onClick }: Props) {
  const sc = STATUS[question.status] || STATUS.DRAFT;
  return (
    <div onClick={onClick} style={{
      background: colors.surfaceRaised, borderRadius: radius.md, padding: 16,
      cursor: 'pointer', border: `1px solid ${colors.border}`,
      transition: 'border-color 0.15s, transform 0.1s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', background: sc.bg, color: sc.text }}>
          {question.status}
        </span>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: DIFF_COLOR[question.difficulty] || colors.muted }}>
          {question.difficulty}
        </span>
        <span style={{ fontSize: 12, color: colors.subtle, marginLeft: 'auto' }}>{question.domain}</span>
      </div>
      <p style={{ fontSize: 14, lineHeight: '1.5', color: colors.body, margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {question.text}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: colors.subtle }}>
          v{question.version} · {question.options.length} opts · {question.correctAnswers.length} correct
        </span>
        <span style={{ fontSize: 12, color: colors.subtle }}>
          {new Date(question.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
