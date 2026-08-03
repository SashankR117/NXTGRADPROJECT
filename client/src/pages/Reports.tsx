import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Download, FileText, Lightbulb, Database, Search, ChevronDown, ChevronUp, CheckCircle, Layers } from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'insights' | 'data'>('insights');
  const [overviewData, setOverviewData] = useState<any>(null);
  const [insightsData, setInsightsData] = useState<any[]>([]);
  const [documentsData, setDocumentsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [docSource, setDocSource] = useState('all');
  const [docSentiment, setDocSentiment] = useState('all');
  const [page, setPage] = useState(1);
  const [expandedInsight, setExpandedInsight] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      api.dashboard.overview(),
      api.dashboard.insights(),
      api.dashboard.explorer({ page: String(page), limit: '15', source: docSource, sentiment: docSentiment, q: searchQuery })
    ]).then(([overviewRes, insightsRes, explorerRes]) => {
      setOverviewData(overviewRes);
      setInsightsData(insightsRes.insights || []);
      setDocumentsData(explorerRes);
    }).finally(() => setLoading(false));
  }, [page, docSource, docSentiment, searchQuery]);

  const handleDownloadInsightsCsv = () => {
    window.open(api.dashboard.exportInsightsUrl(), '_blank');
  };

  const handleDownloadDocumentsCsv = () => {
    const params: Record<string, string> = {};
    if (searchQuery) params.q = searchQuery;
    if (docSource !== 'all') params.source = docSource;
    if (docSentiment !== 'all') params.sentiment = docSentiment;
    window.open(api.dashboard.exportDocumentsUrl(params), '_blank');
  };

  const handleDownloadFullReport = async () => {
    try {
      const data = await api.dashboard.exportFullReport();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `discovery_engine_full_report_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to download full report', err);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedInsight(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredInsights = insightsData.filter(i => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.insight_text?.toLowerCase().includes(q) ||
      i.strategic_question?.toLowerCase().includes(q) ||
      i.theme_name?.toLowerCase().includes(q) ||
      i.recommendation?.toLowerCase().includes(q)
    );
  });

  if (loading && !overviewData) {
    return <div className="loading-container"><div className="spinner" /><span>Preparing Data & Insights Hub...</span></div>;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Overview Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
        <div className="card stat-card">
          <div className="stat-label">Total Insights Collected</div>
          <div className="stat-value" style={{ color: 'var(--accent-indigo-light)' }}>
            {overviewData?.kpis?.totalInsights || insightsData.length}
          </div>
          <div className="stat-change positive">Validated AI Recommendations</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Total Feedback Documents</div>
          <div className="stat-value" style={{ color: 'var(--positive)' }}>
            {overviewData?.kpis?.totalDocuments?.toLocaleString() || 0}
          </div>
          <div className="stat-change positive">Multi-Source Feedback Items</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Active Sources</div>
          <div className="stat-value" style={{ color: '#38bdf8' }}>
            {overviewData?.kpis?.sourcesActive || 0}
          </div>
          <div className="stat-change neutral">App Store, YouTube, Reddit & More</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Discovered Themes</div>
          <div className="stat-value" style={{ color: '#c084fc' }}>
            {overviewData?.kpis?.activeThemes || 0}
          </div>
          <div className="stat-change positive">Clustered Feature Topics</div>
        </div>
      </div>

      {/* Export Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
        {/* Insights Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
              <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo-light)' }}>
                <Lightbulb size={20} />
              </div>
              <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600 }}>Strategic Insights CSV</h3>
            </div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
              Export all strategic questions, key findings, recommendations, confidence percentages, target segments, and evidence quotes.
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleDownloadInsightsCsv}>
            <Download size={16} /> Download Strategic Insights (CSV)
          </button>
        </div>

        {/* Raw Data Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
              <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--positive)' }}>
                <Database size={20} />
              </div>
              <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600 }}>Collected Data CSV</h3>
            </div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
              Export all raw user feedback, scraped review comments, sentiment scores, ratings, platforms, and extracted aspects.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={handleDownloadDocumentsCsv}>
            <Download size={16} /> Download Feedback Dataset (CSV)
          </button>
        </div>

        {/* Executive JSON Report Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
              <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc' }}>
                <FileText size={20} />
              </div>
              <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600 }}>Executive Report (JSON)</h3>
            </div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
              Download complete structured JSON package including full dashboard KPI summaries, theme analytics, and source distributions.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={handleDownloadFullReport} style={{ border: '1px solid var(--border-color)' }}>
            <Download size={16} /> Export Full JSON Report
          </button>
        </div>
      </div>

      {/* Structured Explorer Tabs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Navigation Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-color)',
          background: 'var(--surface-hover)', flexWrap: 'wrap', gap: 'var(--space-md)'
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button
              className={`btn btn-sm ${activeTab === 'insights' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('insights')}
            >
              <Lightbulb size={14} /> Structured Insights ({insightsData.length})
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'data' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('data')}
            >
              <Database size={14} /> Collected Feedback ({documentsData?.total || 0})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1, maxWidth: 400, marginLeft: 'auto' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder={activeTab === 'insights' ? 'Filter insights...' : 'Filter documents...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ fontSize: 'var(--font-xs)' }}
            />
          </div>
        </div>

        {/* Tab Content 1: Insights Table */}
        {activeTab === 'insights' && (
          <div style={{ padding: 'var(--space-md)', overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-xs)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Strategic Question</th>
                  <th style={{ padding: '12px 16px' }}>Insight Summary</th>
                  <th style={{ padding: '12px 16px' }}>Theme</th>
                  <th style={{ padding: '12px 16px' }}>Actionability</th>
                  <th style={{ padding: '12px 16px' }}>Confidence</th>
                  <th style={{ padding: '12px 16px' }}>Evidence</th>
                  <th style={{ padding: '12px 16px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredInsights.map((insight) => {
                  const isExpanded = expandedInsight.has(insight.id);
                  return (
                    <tr key={insight.id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--accent-indigo-light)', maxWidth: 180 }}>
                        {insight.strategic_question}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', maxWidth: 320 }}>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>{insight.insight_text}</div>
                        {insight.recommendation && (
                          <div style={{ color: 'var(--positive)', fontSize: '11px', marginTop: 4 }}>
                            💡 {insight.recommendation}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="tag">{insight.theme_name || 'General'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`sentiment-badge ${insight.actionability === 'high' ? 'positive' : insight.actionability === 'medium' ? 'neutral' : 'mixed'}`}>
                          {insight.actionability}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {(insight.confidence * 100).toFixed(0)}%
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="tag">{insight.evidence?.length || 0} quotes</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleExpand(insight.id)}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab Content 2: Collected Documents Table */}
        {activeTab === 'data' && documentsData && (
          <div style={{ padding: 'var(--space-md)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <select className="input select" value={docSource} onChange={e => { setDocSource(e.target.value); setPage(1); }}>
                <option value="all">All Sources</option>
                <option value="appstore">App Store</option>
                <option value="playstore">Play Store</option>
                <option value="reddit">Reddit</option>
                <option value="youtube">YouTube</option>
                <option value="forum">Forums</option>
                <option value="twitter">Twitter/X</option>
              </select>
              <select className="input select" value={docSentiment} onChange={e => { setDocSentiment(e.target.value); setPage(1); }}>
                <option value="all">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
                <option value="mixed">Mixed</option>
              </select>
              <button className="btn btn-secondary btn-sm" onClick={handleDownloadDocumentsCsv} style={{ marginLeft: 'auto' }}>
                <Download size={14} /> Export Table CSV
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-xs)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px' }}>Source</th>
                    <th style={{ padding: '10px 12px' }}>Rating / Sentiment</th>
                    <th style={{ padding: '10px 12px' }}>Content</th>
                    <th style={{ padding: '10px 12px' }}>Theme</th>
                    <th style={{ padding: '10px 12px' }}>Aspects</th>
                    <th style={{ padding: '10px 12px' }}>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {documentsData.documents?.map((doc: any) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`source-badge ${doc.source}`}>{doc.source}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`sentiment-badge ${doc.sentiment_label}`}>{doc.sentiment_label}</span>
                        {doc.rating && <span style={{ marginLeft: 4, color: '#fbbf24', fontWeight: 600 }}>★{doc.rating}</span>}
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: 350, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.title ? <strong>{doc.title} — </strong> : null}{doc.content}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="tag">{doc.theme_name || 'Unassigned'}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {doc.aspects?.slice(0, 2).map((a: any) => (
                          <span key={a.id} className={`sentiment-badge ${a.sentiment}`} style={{ fontSize: '9px', marginRight: 4 }}>
                            {a.aspect_name}
                          </span>
                        ))}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                        {doc.created_at?.split('T')[0]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {documentsData.totalPages > 1 && (
              <div className="pagination" style={{ marginTop: 'var(--space-md)' }}>
                <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                {Array.from({ length: Math.min(documentsData.totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`pagination-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="pagination-btn" disabled={page >= documentsData.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
