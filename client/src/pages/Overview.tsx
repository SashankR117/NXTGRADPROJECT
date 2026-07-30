import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Layers, TrendingUp, Radio, Lightbulb, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const COLORS = {
  positive: '#10b981',
  negative: '#f43f5e',
  neutral: '#f59e0b',
  mixed: '#8b5cf6',
};

const SOURCE_COLORS: Record<string, string> = {
  appstore: '#60a5fa',
  playstore: '#4ade80',
  reddit: '#fb923c',
  forum: '#c084fc',
  twitter: '#38bdf8',
  reviews: '#fbbf24',
  quickcommerce: '#fb7185',
};

const SOURCE_LABELS: Record<string, string> = {
  appstore: 'App Store',
  playstore: 'Play Store',
  reddit: 'Reddit',
  forum: 'Forums',
  twitter: 'Twitter/X',
  reviews: 'Reviews',
  quickcommerce: 'Quick Commerce',
};

export default function Overview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard.overview().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (!data) return null;

  const sentimentColor = data.kpis.avgSentiment >= 0 ? 'var(--positive)' : 'var(--negative)';

  return (
    <div className="animate-fade-in">
      {/* KPI Row */}
      <div className="kpi-grid">
        <KPICard
          icon={<FileText size={20} />}
          label="Total Documents"
          value={data.kpis.totalDocuments.toLocaleString()}
          change="+12.3%"
          positive
          color="var(--accent-indigo)"
          delay={1}
        />
        <KPICard
          icon={<Layers size={20} />}
          label="Active Themes"
          value={data.kpis.activeThemes}
          change="+2 new"
          positive
          color="var(--accent-violet)"
          delay={2}
        />
        <KPICard
          icon={<TrendingUp size={20} />}
          label="Avg Sentiment"
          value={data.kpis.avgSentiment.toFixed(2)}
          change={data.kpis.avgSentiment >= 0 ? 'Positive' : 'Negative'}
          positive={data.kpis.avgSentiment >= 0}
          color={sentimentColor}
          delay={3}
        />
        <KPICard
          icon={<Radio size={20} />}
          label="Sources Active"
          value={`${data.kpis.sourcesActive}/7`}
          change="All online"
          positive
          color="var(--accent-cyan)"
          delay={4}
        />
        <KPICard
          icon={<Lightbulb size={20} />}
          label="AI Insights"
          value={data.kpis.totalInsights}
          change="High confidence"
          positive
          color="var(--accent-amber)"
          delay={5}
        />
      </div>

      {/* Charts Row */}
      <div className="grid-2 mb-lg">
        {/* Sentiment Trend */}
        <div className="card animate-slide-up stagger-1">
          <div className="card-header">
            <span className="card-title">Sentiment Trend (60 days)</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.sentimentTrend}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => v?.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[-1, 1]} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }} />
              <Area type="monotone" dataKey="avg_sentiment" stroke="#6366f1" fill="url(#sentGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Volume by Source */}
        <div className="card animate-slide-up stagger-2">
          <div className="card-header">
            <span className="card-title">Volume by Source</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.volumeBySource} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis dataKey="source" type="category" width={100} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => SOURCE_LABELS[v] || v} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                {data.volumeBySource.map((entry: any, i: number) => (
                  <Cell key={i} fill={SOURCE_COLORS[entry.source] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sentiment Distribution + Top Themes */}
      <div className="grid-2 mb-lg">
        {/* Sentiment Pie */}
        <div className="card animate-slide-up stagger-3">
          <div className="card-header">
            <span className="card-title">Sentiment Distribution</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={data.sentimentDistribution} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {data.sentimentDistribution.map((entry: any, i: number) => (
                    <Cell key={i} fill={COLORS[entry.label as keyof typeof COLORS] || '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.sentimentDistribution.map((item: any) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[item.label as keyof typeof COLORS] }} />
                  <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {item.label}: <strong>{item.count.toLocaleString()}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Themes */}
        <div className="card animate-slide-up stagger-4">
          <div className="card-header">
            <span className="card-title">Top Themes</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.topThemes.map((theme: any, i: number) => (
              <div key={theme.id} style={{
                padding: '12px',
                background: 'var(--bg-glass)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{theme.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                    {theme.document_count} documents
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`sentiment-badge ${(theme.avg_sentiment || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(theme.avg_sentiment || 0) >= 0 ? '↑' : '↓'} {Math.abs(theme.avg_sentiment || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest Insights */}
      <div className="card animate-slide-up stagger-5 mb-lg">
        <div className="card-header">
          <span className="card-title">Latest High-Confidence Insights</span>
          <a href="/insights" className="btn btn-ghost btn-sm">View all →</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.latestInsights.map((insight: any) => (
            <div key={insight.id} className="insight-card card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div className="insight-text" style={{ fontSize: 'var(--font-sm)' }}>
                    {insight.insight_text.slice(0, 200)}...
                  </div>
                  <div className="insight-meta" style={{ marginTop: '8px' }}>
                    <span className="tag">{insight.theme_name}</span>
                    <span className={`sentiment-badge ${insight.actionability === 'high' ? 'positive' : 'neutral'}`}>
                      {insight.actionability} actionability
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Confidence:</span>
                      <div className="confidence-bar">
                        <div className="confidence-bar-fill" style={{ width: `${insight.confidence * 100}%` }} />
                      </div>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                        {(insight.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, change, positive, color, delay }: {
  icon: React.ReactNode; label: string; value: string | number;
  change: string; positive: boolean; color: string; delay: number;
}) {
  return (
    <div className={`card kpi-card animate-slide-up stagger-${delay}`}>
      <div className="kpi-icon" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div className="kpi-value animate-count-up" style={{ color }}>{value}</div>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-change ${positive ? 'positive' : 'negative'}`}>
        {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {change}
      </div>
    </div>
  );
}
