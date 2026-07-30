import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Filter, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Insights() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [questionFilter, setQuestionFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const params: Record<string, string> = {};
    if (questionFilter !== 'all') params.question = questionFilter;
    if (actionFilter !== 'all') params.actionability = actionFilter;
    api.dashboard.insights(params).then(setData).finally(() => setLoading(false));
  }, [questionFilter, actionFilter]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading insights...</span></div>;
  if (!data) return null;

  return (
    <div className="animate-fade-in">
      {/* Filters */}
      <div className="filter-bar">
        <Filter size={16} style={{ color: 'var(--text-muted)' }} />
        <select
          className="input select"
          value={questionFilter}
          onChange={e => setQuestionFilter(e.target.value)}
        >
          <option value="all">All Strategic Questions</option>
          {data.questions.map((q: any) => (
            <option key={q.strategic_question} value={q.strategic_question}>
              {q.strategic_question}
            </option>
          ))}
        </select>
        <select
          className="input select"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
        >
          <option value="all">All Actionability</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {data.insights.length} insights found
        </span>
      </div>

      {/* Insights Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {data.insights.map((insight: any, i: number) => {
          const isExpanded = expanded.has(insight.id);
          return (
            <div key={insight.id} className={`card insight-card animate-slide-up stagger-${Math.min(i + 1, 5)}`}>
              {/* Strategic Question Tag */}
              <div style={{ marginBottom: 'var(--space-sm)' }}>
                <span style={{
                  fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--accent-indigo-light)',
                  background: 'var(--accent-indigo-glow)', padding: '4px 10px', borderRadius: 'var(--radius-full)',
                }}>
                  {insight.strategic_question}
                </span>
              </div>

              {/* Insight Text */}
              <p className="insight-text">{insight.insight_text}</p>

              {/* Recommendation */}
              {insight.recommendation && (
                <div style={{
                  margin: 'var(--space-md) 0', padding: 'var(--space-md)',
                  background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                }}>
                  <div style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--positive)', marginBottom: 6 }}>
                    💡 RECOMMENDATION
                  </div>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {insight.recommendation}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="insight-meta">
                <span className="tag">{insight.theme_name}</span>
                <span className={`sentiment-badge ${insight.actionability === 'high' ? 'positive' : insight.actionability === 'medium' ? 'neutral' : 'mixed'}`}>
                  {insight.actionability}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Confidence:</span>
                  <div className="confidence-bar" style={{ width: 80 }}>
                    <div className="confidence-bar-fill" style={{ width: `${insight.confidence * 100}%` }} />
                  </div>
                  <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600 }}>{(insight.confidence * 100).toFixed(0)}%</span>
                </div>
                {/* Segments */}
                {insight.user_segments?.map((seg: string) => (
                  <span key={seg} className="tag" style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)', color: '#c084fc' }}>
                    {seg}
                  </span>
                ))}
              </div>

              {/* Expandable Evidence */}
              <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleExpand(insight.id)}>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {insight.evidence?.length || 0} evidence quotes
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/chat')} style={{ color: 'var(--accent-indigo-light)' }}>
                  <MessageSquare size={14} /> Explore in Chat
                </button>
              </div>

              {isExpanded && insight.evidence?.length > 0 && (
                <div className="evidence-list animate-fade-in">
                  {insight.evidence.map((ev: any) => (
                    <div key={ev.id} className="evidence-quote">
                      "{ev.quote}"
                      <div className="evidence-source">
                        <span className={`source-badge ${ev.source}`} style={{ marginRight: 4 }}>{ev.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
