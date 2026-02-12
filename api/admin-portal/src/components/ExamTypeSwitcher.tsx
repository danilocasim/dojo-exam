import type { ExamType } from '../services/api';

interface ExamTypeSwitcherProps {
  examTypes: ExamType[];
  selected: string;
  onChange: (id: string) => void;
}

/**
 * T098: Exam type switcher component
 * Displays dropdown to switch between exam types
 */
export function ExamTypeSwitcher({
  examTypes,
  selected,
  onChange,
}: ExamTypeSwitcherProps) {
  if (examTypes.length === 0) {
    return <div style={styles.loading}>Loading exam types...</div>;
  }

  return (
    <div style={styles.container}>
      <label style={styles.label}>Exam Type</label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        style={styles.select}
      >
        {examTypes.map((et) => (
          <option key={et.id} value={et.id}>
            {et.displayName} — {et.name}
          </option>
        ))}
      </select>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 600,
  },
  select: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: 13,
    cursor: 'pointer',
  },
  loading: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    padding: '8px 0',
  },
};
