import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const SOURCE_LABELS: Record<string, string> = {
  appstore: 'App Store', playstore: 'Play Store', reddit: 'Reddit',
  forum: 'Forums', twitter: 'Twitter/X', reviews: 'Reviews', quickcommerce: 'Quick Commerce', youtube: 'YouTube',
};

const SOURCE_COLORS: Record<string, string> = {
  appstore: '#60a5fa', playstore: '#4ade80', reddit: '#fb923c',
  forum: '#c084fc', twitter: '#38bdf8', reviews: '#fbbf24', quickcommerce: '#fb7185', youtube: '#ef4444',
};

const SENT_COLORS = { positive: '#10b981', negative: '#f43f5e', neutral: '#f59e0b', mixed: '#8b5cf6' };

export default function Sources() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState<string>('');

  useEffect(() => {
    api.dashboard.sources().then(d => {
      setData(d);
      if (d.sources?.length > 0) setActiveSource(d.sources[0].source);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading sources...</span></div>;
  if (!data) return null;

  const activeData = data.sources.find((s: any) => s.source === activeSource);
  const sentPie = activeData ? [
    { name: 'Positive', value: activeData.positive_count, color: SENT_COLORS.positive },
    { name: 'Negative', value: activeData.negative_count, color: SENT_COLORS.negative },
    { name: 'Neutral', value: activeData.neutral_count, color: SENT_COLORS.neutral },
    { name: 'Mixed', value: activeData.mixed_count, color: SENT_COLORS.mixed },
  ] : [];

  return (
    <div className="animate-fade-in">
      {/* Source Tabs */}
      <div className="tabs">
        {data.sources.map((s: any) => (
          <button
            key={s.source}
            className={`tab ${activeSource === s.source ? 'active' : ''}`}
            onClick={() => setActiveSource(s.source)}
          >
            <span style={{ color: SOURCE_COLORS[s.source] }}>●</span> {SOURCE_LABELS[s.source] || s.source}
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginLeft: 4 }}>({s.total})</span>
          </button>
        ))}
      </div>

      {activeData && (
        <div className="animate-fade-in">
          {/* Stats Row */}
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: SOURCE_COLORS[activeSource] }}>{activeData.total}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Total Documents</div>
            </div>
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--positive)' }}>{activeData.positive_count}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Positive</div>
            </div>
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--negative)' }}>{activeData.negative_count}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Negative</div>
            </div>
            <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: (activeData.avg_sentiment || 0) >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                {(activeData.avg_sentiment || 0).toFixed(2)}
              </div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Avg Sentiment</div>
            </div>
          </div>

          <div className="grid-2 mb-lg">
            {/* Sentiment Distribution */}
            <div className="card">
              <div className="card-header"><span className="card-title">Sentiment Distribution</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sentPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {sentPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {sentPie.map(item => (
                  <span key={item.name} style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                    {item.name}: {item.value}
                  </span>
                ))}
              </div>
            </div>

            {/* Top Aspects */}
            <div className="card">
              <div className="card-header"><span className="card-title">Top Aspects</span></div>
              {data.sourceAspects[activeSource] && (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.sourceAspects[activeSource].slice(0, 8)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis dataKey="aspect_name" type="category" width={120} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
                      {data.sourceAspects[activeSource].slice(0, 8).map((entry: any, i: number) => (
                        <Cell key={i} fill={SENT_COLORS[entry.sentiment as keyof typeof SENT_COLORS] || '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Volume Trend */}
          {data.sourceTrends[activeSource] && (
            <div className="card mb-lg">
              <div className="card-header"><span className="card-title">Volume Over Time</span></div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.sourceTrends[activeSource]}>
                  <defs>
                    <linearGradient id={`grad-${activeSource}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={SOURCE_COLORS[activeSource]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={SOURCE_COLORS[activeSource]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }} />
                  <Area type="monotone" dataKey="volume" stroke={SOURCE_COLORS[activeSource]} fill={`url(#grad-${activeSource})`} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
