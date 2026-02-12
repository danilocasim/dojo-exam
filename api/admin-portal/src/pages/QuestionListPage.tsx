import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { AdminQuestion } from '../services/api';
import { useSelectedExamType } from '../components/Layout';
import { QuestionCard } from '../components/QuestionCard';

/**
 * T094: Question list page with filters and pagination
 */
export function QuestionListPage() {
  const navigate = useNavigate();
  const { selectedExamType } = useSelectedExamType();
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [status, setStatus] = useState('');
  const [domain, setDomain] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const { examTypes } = useSelectedExamType();
  const currentExamType = examTypes.find((et) => et.id === selectedExamType);
  const domains = currentExamType?.domains || [];

  const fetchQuestions = useCallback(async () => {
    if (!selectedExamType) return;
    setLoading(true);
    try {
      const data = await api.getQuestions({
        examTypeId: selectedExamType,
        status: status || undefined,
        domain: domain || undefined,
        difficulty: difficulty || undefined,
        page,
        limit: 20,
      });
      setQuestions(data.questions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      // error handled by api service
    } finally {
      setLoading(false);
    }
  }, [selectedExamType, status, domain, difficulty, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedExamType, status, domain, difficulty]);

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Questions</h1>
        <button
          onClick={() => navigate('/questions/new')}
          style={styles.createBtn}
        >
          + New Question
        </button>
      </div>

      <div style={styles.filters}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Domains</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        <span style={styles.count}>
          {total} question{total !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading questions...</div>
      ) : questions.length === 0 ? (
        <div style={styles.empty}>
          No questions found.{' '}
          <button
            onClick={() => navigate('/questions/new')}
            style={styles.emptyLink}
          >
            Create one
          </button>
        </div>
      ) : (
        <div style={styles.list}>
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onClick={() => navigate(`/questions/${q.id}`)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={styles.pageBtn}
          >
            ← Previous
          </button>
          <span style={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={styles.pageBtn}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  createBtn: {
    padding: '8px 20px',
    background: '#1677ff',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  filters: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '6px 12px',
    border: '1px solid #d9d9d9',
    borderRadius: 4,
    fontSize: 13,
    background: '#fff',
  },
  count: {
    fontSize: 13,
    color: '#666',
    marginLeft: 'auto',
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    color: '#999',
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: '#999',
    fontSize: 14,
  },
  emptyLink: {
    background: 'none',
    border: 'none',
    color: '#1677ff',
    cursor: 'pointer',
    fontSize: 14,
    textDecoration: 'underline',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
  },
  pageBtn: {
    padding: '6px 16px',
    border: '1px solid #d9d9d9',
    borderRadius: 4,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
  },
  pageInfo: {
    fontSize: 13,
    color: '#666',
  },
};
