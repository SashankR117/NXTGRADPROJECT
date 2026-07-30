import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Layers, FileText, TrendingUp } from 'lucide-react';

export default function Themes() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);
  const [themeDetail, setThemeDetail] = useState<any>(null);

  useEffect(() => {
    api.dashboard.themes().then(d => {
      setData(d);
      if (d.themes?.length > 0) {
        setSelectedTheme(d.themes[0].id);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedTheme !== null) {
      api.dashboard.themeDetail(selectedTheme).then(setThemeDetail);
    }
  }, [selectedTheme]);

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading themes...</span></div>;
  if (!data) return null;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 'var(--space-md)', height: 'calc(100vh - 140px)' }}>
        {/* Theme List */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
          {data.themes.map((theme: any) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <div
                key={theme.id}
                className={`card theme-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedTheme(theme.id)}
                style={{
                  padding: '16px',
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                  borderLeft: isSelected ? '4px solid var(--accent-indigo)' : '1px solid var(--border-primary)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-glass)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="theme-name" style={{ margin: 0, fontWeight: isSelected ? 700 : 600 }}>{theme.name}</div>
                  {isSelected && (
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--accent-indigo)', color: 'white', fontWeight: 600 }}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="theme-desc" style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                  {theme.description}
                </div>
                <div className="theme-stats" style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span><FileText size={12} /> {theme.document_count} docs</span>
                  <span><Layers size={12} /> {theme.topic_count} topics</span>
                  <span>
                    <TrendingUp size={12} />
                    <span className={`sentiment-badge ${(theme.avg_sentiment || 0) >= 0 ? 'positive' : 'negative'}`} style={{ marginLeft: 4 }}>
                      {(theme.avg_sentiment || 0).toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Theme Detail */}
        <div style={{ overflowY: 'auto' }}>
          {themeDetail ? (
            <div className="animate-fade-in">
              {/* Header */}
              <div className="card mb-md" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)' }}>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
                  {themeDetail.theme.name}
                </h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {themeDetail.theme.description}
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-md)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-indigo-light)' }}>{themeDetail.theme.document_count}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Documents</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-violet)' }}>{themeDetail.topics.length}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Topics</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-emerald)' }}>{themeDetail.insights.length}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Insights</div>
                  </div>
                </div>
              </div>

              {/* Topics */}
              <div className="card mb-md">
                <div className="card-header">
                  <span className="card-title">Topics</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                  {themeDetail.topics.map((topic: any) => {
                    const keywords = JSON.parse(topic.keywords || '[]');
                    return (
                      <div key={topic.id} style={{
                        padding: '12px 16px',
                        background: 'var(--bg-glass)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        flex: '1 1 200px',
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 4 }}>{topic.label}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {keywords.slice(0, 4).map((kw: string) => (
                            <span key={kw} className="tag">{kw}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 6 }}>
                          {topic.document_count} documents
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Source Distribution */}
              <div className="card mb-md">
                <div className="card-header">
                  <span className="card-title">Source Distribution</span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  {themeDetail.sourceDistribution.map((s: any) => (
                    <div key={s.source} className={`source-badge ${s.source}`}>
                      {s.source}: {s.count}
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights for this theme */}
              {themeDetail.insights.length > 0 && (
                <div className="card mb-md">
                  <div className="card-header">
                    <span className="card-title">AI Insights</span>
                  </div>
                  {themeDetail.insights.map((insight: any) => (
                    <div key={insight.id} className="insight-card card" style={{ padding: '14px', marginBottom: '8px' }}>
                      <p className="insight-text" style={{ fontSize: 'var(--font-sm)' }}>{insight.insight_text}</p>
                      {insight.recommendation && (
                        <div style={{
                          marginTop: '8px', padding: '10px', background: 'rgba(16, 185, 129, 0.05)',
                          borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.15)',
                        }}>
                          <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--positive)', marginBottom: 4 }}>💡 Recommendation</div>
                          <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{insight.recommendation}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Representative Documents */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Representative Feedback</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {themeDetail.documents.slice(0, 8).map((doc: any) => (
                    <div key={doc.id} className="doc-card card" style={{ padding: '12px' }}>
                      <div className="doc-meta">
                        <span className={`source-badge ${doc.source}`}>{doc.source}</span>
                        <span className={`sentiment-badge ${doc.sentiment_label}`}>{doc.sentiment_label}</span>
                        {doc.rating && <span className="tag">★ {doc.rating}</span>}
                      </div>
                      <div className="doc-content">{doc.content.slice(0, 200)}...</div>
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                        {doc.product} · {doc.category} · {doc.created_at?.split('T')[0]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ height: '100%' }}>
              <Layers size={48} />
              <h3>Select a theme</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: 400 }}>
                Click on a theme from the left panel to explore its topics, insights, and representative documents.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
