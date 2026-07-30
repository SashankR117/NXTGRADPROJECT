import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Users } from 'lucide-react';

const BAR_COLORS: Record<string, string> = {
  exploration: '#6366f1',
  categoryDiversity: '#8b5cf6',
  sentiment: '#10b981',
  engagement: '#06b6d4',
  reviewFrequency: '#f59e0b',
};

const BAR_LABELS: Record<string, string> = {
  exploration: 'Exploration',
  categoryDiversity: 'Category Diversity',
  sentiment: 'Sentiment',
  engagement: 'Engagement',
  reviewFrequency: 'Review Frequency',
};

export default function Segments() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard.segments().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading segments...</span></div>;
  if (!data) return null;

  const dims = ['exploration', 'categoryDiversity', 'sentiment', 'engagement', 'reviewFrequency'];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--space-md)' }}>
        {data.segments.map((seg: any, i: number) => (
          <div key={seg.name} className={`card segment-card animate-slide-up stagger-${Math.min(i + 1, 5)}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <div>
                <div className="segment-name">{seg.name}</div>
                <div className="segment-desc">{seg.description}</div>
              </div>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--accent-indigo-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users size={20} style={{ color: 'var(--accent-indigo-light)' }} />
              </div>
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              background: 'var(--bg-glass)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-primary)',
              marginBottom: 'var(--space-md)', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600,
            }}>
              ~{seg.size}% of user base
            </div>

            {/* Dimension Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {dims.map(dim => (
                <div key={dim} className="segment-bar">
                  <div className="segment-bar-label">{BAR_LABELS[dim]}</div>
                  <div className="segment-bar-track">
                    <div className="segment-bar-fill" style={{
                      width: `${seg[dim]}%`,
                      background: BAR_COLORS[dim],
                    }} />
                  </div>
                  <div className="segment-bar-value">{seg[dim]}</div>
                </div>
              ))}
            </div>

            {/* Top Themes & Frustrations */}
            <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-md)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Top Themes</div>
                {seg.topThemes.map((t: string) => (
                  <div key={t} style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>• {t}</div>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Top Frustrations</div>
                {seg.topFrustrations.map((f: string) => (
                  <div key={f} style={{ fontSize: 'var(--font-xs)', color: 'var(--negative)', marginBottom: 2 }}>• {f}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
