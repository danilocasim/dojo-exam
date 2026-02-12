import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { AdminQuestion, QuestionInput } from '../services/api';
import { useSelectedExamType } from '../components/Layout';
import { QuestionForm } from '../components/QuestionForm';
import { colors, radius } from '../theme';

export function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedExamType, examTypes } = useSelectedExamType();
  const [question, setQuestion] = useState<AdminQuestion | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [actionLoading, setActionLoading] = useState('');
  const [isEditing, setIsEditing] = useState(!id);

  useEffect(() => { if (!id) return; setLoading(true); api.getQuestion(id).then(setQuestion).catch(() => navigate('/questions')).finally(() => setLoading(false)); }, [id, navigate]);

  const handleCreate = useCallback(async (input: QuestionInput) => { await api.createQuestion(input); navigate('/questions'); }, [navigate]);
  const handleUpdate = useCallback(async (input: QuestionInput) => { if (!id) return; const u = await api.updateQuestion(id, input); setQuestion(u); setIsEditing(false); }, [id]);

  const handleAction = useCallback(async (action: 'approve' | 'archive' | 'restore') => {
    if (!id) return; setActionLoading(action);
    try { const fns = { approve: api.approveQuestion, archive: api.archiveQuestion, restore: api.restoreQuestion }; const u = await fns[action](id); setQuestion(u); } catch (err) { alert(err instanceof Error ? err.message : 'Action failed'); } finally { setActionLoading(''); }
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: colors.subtle }}>Loading...</div>;

  // Create mode
  if (!id) return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.heading, marginBottom: 16 }}>New Question</h1>
      <QuestionForm examTypes={examTypes} selectedExamType={selectedExamType} onSubmit={handleCreate} onCancel={() => navigate('/questions')} submitLabel="Create Question" />
    </div>
  );

  // Edit mode
  if (isEditing && question) return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.heading, marginBottom: 16 }}>Edit Question</h1>
      <QuestionForm examTypes={examTypes} selectedExamType={selectedExamType} initialValues={{ examTypeId: question.examTypeId, text: question.text, type: question.type as QuestionInput['type'], domain: question.domain, difficulty: question.difficulty as QuestionInput['difficulty'], options: question.options, correctAnswers: question.correctAnswers, explanation: question.explanation }} onSubmit={handleUpdate} onCancel={() => setIsEditing(false)} submitLabel="Save Changes" />
    </div>
  );

  if (!question) return null;

  const STATUS_MAP: Record<string, { bg: string; text: string }> = {
    DRAFT: colors.draft, PENDING: colors.pending, APPROVED: colors.approved, ARCHIVED: colors.archived,
  };
  const sc = STATUS_MAP[question.status] || STATUS_MAP.DRAFT;
  const DIFF_COLOR: Record<string, string> = { EASY: colors.easy, MEDIUM: colors.medium, HARD: colors.hard };

  const btnBase: React.CSSProperties = { padding: '8px 18px', borderRadius: radius.sm, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: 'none' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <button onClick={() => navigate('/questions')} style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: 14, padding: 0, fontWeight: 500 }}>{'\u2190'} Back</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(question.status === 'DRAFT' || question.status === 'PENDING') && (
            <button onClick={() => setIsEditing(true)} style={{ ...btnBase, background: colors.surfaceHover, color: colors.body, border: `1px solid ${colors.border}` }}>Edit</button>
          )}
          {question.status === 'PENDING' && (
            <button onClick={() => handleAction('approve')} disabled={!!actionLoading} style={{ ...btnBase, background: colors.success, color: '#fff' }}>{actionLoading === 'approve' ? '...' : '\u2713 Approve'}</button>
          )}
          {['APPROVED', 'PENDING', 'DRAFT'].includes(question.status) && (
            <button onClick={() => handleAction('archive')} disabled={!!actionLoading} style={{ ...btnBase, background: 'transparent', border: `1px solid ${colors.error}`, color: colors.error }}>{actionLoading === 'archive' ? '...' : 'Archive'}</button>
          )}
          {question.status === 'ARCHIVED' && (
            <button onClick={() => handleAction('restore')} disabled={!!actionLoading} style={{ ...btnBase, background: colors.info, color: '#fff' }}>{actionLoading === 'restore' ? '...' : 'Restore'}</button>
          )}
        </div>
      </div>

      <div style={{ background: colors.surfaceRaised, borderRadius: radius.md, padding: 24, border: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', background: sc.bg, color: sc.text }}>{question.status}</span>
          <span style={{ fontSize: 13, color: DIFF_COLOR[question.difficulty] || colors.muted }}>{question.difficulty}</span>
          <span style={{ fontSize: 13, color: colors.subtle }}>{question.domain}</span>
          <span style={{ fontSize: 13, color: colors.subtle }}>v{question.version}</span>
        </div>

        <h2 style={{ fontSize: 17, fontWeight: 600, lineHeight: '1.6', color: colors.heading, marginBottom: 20 }}>{question.text}</h2>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: colors.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Options</h3>
          {question.options.map((opt) => {
            const isCorrect = question.correctAnswers.includes(opt.id);
            return (
              <div key={opt.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: radius.sm,
                border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : colors.border}`,
                background: isCorrect ? colors.successMuted : 'transparent', marginBottom: 6, fontSize: 14, color: colors.body,
              }}>
                <span style={{ fontWeight: 700, color: colors.subtle, width: 18 }}>{opt.id}</span>
                <span style={{ flex: 1 }}>{opt.text}</span>
                {isCorrect && <span style={{ color: colors.success, fontSize: 12, fontWeight: 600 }}>{'\u2713'} Correct</span>}
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: colors.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Explanation</h3>
          <p style={{ fontSize: 14, lineHeight: '1.7', color: colors.body, background: colors.surface, padding: 14, borderRadius: radius.sm }}>{question.explanation}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: `1px solid ${colors.border}`, paddingTop: 16 }}>
          {[
            ['Created by', question.createdBy?.name || '\u2014'],
            ['Created', new Date(question.createdAt).toLocaleString()],
            ...(question.approvedBy ? [['Approved by', question.approvedBy.name]] : []),
            ...(question.approvedAt ? [['Approved', new Date(question.approvedAt).toLocaleString()]] : []),
            ...(question.archivedAt ? [['Archived', new Date(question.archivedAt).toLocaleString()]] : []),
          ].map(([label, value], i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: colors.subtle, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</span>
              <span style={{ fontSize: 13, color: colors.body }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
