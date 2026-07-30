import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const THEME_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#38bdf8', '#a78bfa'];

export default function Trends() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard.trends().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading trends...</span></div>;
  if (!data) return null;

  // Transform timeline data for multi-line chart
  const dates = [...new Set(data.themeTimelines.map((t: any) => t.date))].sort() as string[];
  const themes = [...new Set(data.themeTimelines.map((t: any) => t.theme_name))] as string[];
  const chartData = dates.map(date => {
    const point: any = { date };
    for (const theme of themes) {
      const entry = data.themeTimelines.find((t: any) => t.date === date && t.theme_name === theme);
      point[theme] = entry?.volume || 0;
    }
    return point;
  });

  return (
    <div className="animate-fade-in">
      {/* Theme Volume Over Time */}
      <div className="card mb-lg">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <span className="card-title">Theme Volume Over Time</span>
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
            Hover over a theme tag or line to highlight specific trends
          </span>
        </div>

        {/* Interactive Theme Filter Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 'var(--space-md)' }}>
          <button
            className={`btn btn-xs ${activeTheme === null ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTheme(null)}
          >
            Show All
          </button>
          {themes.map((theme, i) => {
            const color = THEME_COLORS[i % THEME_COLORS.length];
            const isSelected = activeTheme === theme;
            return (
              <button
                key={theme}
                style={{
                  fontSize: '11px', padding: '3px 10px', borderRadius: 'var(--radius-full)',
                  border: `1px solid ${isSelected ? color : 'var(--border-primary)'}`,
                  background: isSelected ? `${color}25` : 'var(--bg-glass)',
                  color: isSelected ? color : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.2s',
                  opacity: activeTheme && !isSelected ? 0.35 : 1,
                  fontWeight: isSelected ? 600 : 400,
                }}
                onMouseEnter={() => setActiveTheme(theme)}
                onMouseLeave={() => setActiveTheme(null)}
                onClick={() => setActiveTheme(isSelected ? null : theme)}
              >
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 6 }} />
                {theme}
              </button>
            );
          })}
        </div>

        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => v?.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
            <Legend
              wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
              onMouseEnter={(e: any) => setActiveTheme(e.dataKey)}
              onMouseLeave={() => setActiveTheme(null)}
            />
            {themes.map((theme, i) => {
              const isHovered = activeTheme === theme;
              const isDimmed = activeTheme !== null && !isHovered;
              return (
                <Line
                  key={theme}
                  type="monotone"
                  dataKey={theme}
                  stroke={THEME_COLORS[i % THEME_COLORS.length]}
                  strokeWidth={isHovered ? 4 : isDimmed ? 1 : 2}
                  strokeOpacity={isDimmed ? 0.12 : 1}
                  dot={false}
                  activeDot={{ r: isHovered ? 6 : 4 }}
                  onMouseEnter={() => setActiveTheme(theme)}
                  onMouseLeave={() => setActiveTheme(null)}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>


      <div className="grid-2 mb-lg">
        {/* Emerging Topics */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔥 Emerging Topics</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.emerging.map((topic: any, i: number) => {
              const growth = topic.prior_count > 0
                ? ((topic.recent_count - topic.prior_count) / topic.prior_count * 100).toFixed(0)
                : topic.recent_count > 0 ? '+∞' : '0';
              const isGrowing = topic.recent_count > topic.prior_count;

              return (
                <div key={i} style={{
                  padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{topic.label}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{topic.theme_name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                      {topic.recent_count} (7d)
                    </span>
                    <span className={`kpi-change ${isGrowing ? 'positive' : 'negative'}`}>
                      {isGrowing ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {growth}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sentiment Shifts */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Sentiment Shifts</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.sentimentShifts.map((shift: any, i: number) => {
              const recent = shift.recent_sentiment || 0;
              const prior = shift.prior_sentiment || 0;
              const delta = recent - prior;
              const isImproved = delta > 0;

              return (
                <div key={i} style={{
                  padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{shift.theme_name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: 'var(--font-sm)', color: recent >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                      {recent.toFixed(2)}
                    </span>
                    <span className={`kpi-change ${isImproved ? 'positive' : delta < -0.01 ? 'negative' : ''}`} style={{ minWidth: 60 }}>
                      {isImproved ? <TrendingUp size={12} /> : delta < -0.01 ? <TrendingDown size={12} /> : <Minus size={12} />}
                      {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
