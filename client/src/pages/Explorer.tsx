import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, Filter, Download } from 'lucide-react';

export default function Explorer() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [sentiment, setSentiment] = useState('all');
  const [page, setPage] = useState(1);

  const fetchData = () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '15' };
    if (query) params.q = query;
    if (source !== 'all') params.source = source;
    if (sentiment !== 'all') params.sentiment = sentiment;
    api.dashboard.explorer(params).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page, source, sentiment]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleDownloadCsv = () => {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (source !== 'all') params.source = source;
    if (sentiment !== 'all') params.sentiment = sentiment;
    window.open(api.dashboard.exportDocumentsUrl(params), '_blank');
  };

  return (
    <div className="animate-fade-in">
      {/* Search & Filters */}
      <form onSubmit={handleSearch} className="filter-bar">
        <Search size={16} style={{ color: 'var(--text-muted)' }} />
        <input
          className="input"
          placeholder="Search documents..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <select className="input select" value={source} onChange={e => { setSource(e.target.value); setPage(1); }}>
          <option value="all">All Sources</option>
          <option value="appstore">App Store</option>
          <option value="playstore">Play Store</option>
          <option value="reddit">Reddit</option>
          <option value="youtube">YouTube</option>
          <option value="forum">Forums</option>
          <option value="twitter">Twitter/X</option>
          <option value="reviews">Reviews</option>
          <option value="quickcommerce">Quick Commerce</option>
        </select>
        <select className="input select" value={sentiment} onChange={e => { setSentiment(e.target.value); setPage(1); }}>
          <option value="all">All Sentiment</option>
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="neutral">Neutral</option>
          <option value="mixed">Mixed</option>
        </select>
        <button type="submit" className="btn btn-primary">Search</button>
        <button type="button" className="btn btn-secondary" onClick={handleDownloadCsv} title="Download current filtered documents as CSV">
          <Download size={14} /> Download CSV
        </button>
      </form>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Searching...</span></div>
      ) : data ? (
        <>
          <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
            Showing {data.documents.length} of {data.total.toLocaleString()} documents · Page {data.page}/{data.totalPages}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {data.documents.map((doc: any) => (
              <div key={doc.id} className="card doc-card">
                <div className="doc-meta">
                  <span className={`source-badge ${doc.source}`}>{doc.source}</span>
                  <span className={`sentiment-badge ${doc.sentiment_label}`}>{doc.sentiment_label}</span>
                  {doc.rating && <span className="tag">★ {doc.rating}</span>}
                  <span className="tag">{doc.theme_name || 'Unassigned'}</span>
                  {doc.product && <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{doc.product}</span>}
                </div>
                {doc.title && (
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', marginTop: 6 }}>{doc.title}</div>
                )}
                <div className="doc-content">{doc.content}</div>
                {doc.aspects && doc.aspects.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {doc.aspects.map((a: any) => (
                      <span key={a.id} className={`sentiment-badge ${a.sentiment}`} style={{ fontSize: '10px' }}>
                        {a.aspect_name}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 6 }}>
                  {doc.category} · {doc.platform} · {doc.created_at?.split('T')[0]}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`pagination-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="pagination-btn" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
