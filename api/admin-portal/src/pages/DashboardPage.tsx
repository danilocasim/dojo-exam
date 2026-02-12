import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AdminStats } from '../services/api';
import { useSelectedExamType } from '../components/Layout';
import { colors, radius } from '../theme';

export function DashboardPage() {
  const { selectedExamType, examTypes } = useSelectedExamType();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const currentExamType = examTypes.find((et) => et.id === selectedExamType);

  useEffect(() => {
    if (!selectedExamType) return;
    setLoading(true);
    api.getStats(selectedExamType).then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, [selectedExamType]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: colors.subtle }}>Loading stats...</div>;
  if (!stats) return <div style={{ padding: 40, textAlign: 'center', color: colors.subtle }}>No data available</div>;

  const statCards = [
    { label: 'Total', value: stats.totalQuestions, color: colors.primary },
    { label: 'Draft', value: stats.byStatus.draft, color: colors.muted },
    { label: 'Pending', value: stats.byStatus.pending, color: colors.warning },
    { label: 'Approved', value: stats.byStatus.approved, color: colors.success },
    { label: 'Archived', value: stats.byStatus.archived, color: colors.error },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.heading, marginBottom: 24 }}>
        Dashboard{currentExamType ? ` \u2014 ${currentExamType.displayName}` : ''}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, marginBottom: 32 }}>
        {statCards.map((c) => (
          <div key={c.label} style={{ background: colors.surfaceRaised, borderRadius: radius.md, padding: '20px 16px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, marginBottom: 6, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 13, color: colors.subtle }}>{c.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.body, marginBottom: 14 }}>By Domain</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {Object.entries(stats.byDomain).map(([domain, count]) => {
          const info = currentExamType?.domains.find((d) => d.id === domain);
          const pct = info ? Math.min(100, Math.round((count / info.questionCount) * 100)) : 0;
          return (
            <div key={domain} style={{ background: colors.surfaceRaised, borderRadius: radius.md, padding: 16, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: colors.body, marginBottom: 10, minHeight: 40 }}>{info?.name || domain}</div>
              <div style={{ marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: info ? 10 : 0 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: colors.primary, lineHeight: 1 }}>{count}</span>
                  {info && <span style={{ fontSize: 12, color: colors.subtle, whiteSpace: 'nowrap' }}>/ {info.questionCount} target ({pct}%)</span>}
                </div>
                {info && (
                  <div style={{ height: 6, background: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? colors.success : colors.primary, borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {Object.keys(stats.byDomain).length === 0 && (
          <div style={{ color: colors.subtle, fontSize: 14, padding: 16 }}>No questions yet</div>
        )}
      </div>
    </div>
  );
}
