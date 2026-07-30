import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const SOURCE_LABELS: Record<string, string> = {
  appstore: 'App Store', playstore: 'Play Store', reddit: 'Reddit',
  forum: 'Forums', twitter: 'Twitter/X', reviews: 'Reviews', quickcommerce: 'Quick Commerce',
};

const SOURCE_COLORS: Record<string, string> = {
  appstore: '#60a5fa', playstore: '#4ade80', reddit: '#fb923c',
  forum: '#c084fc', twitter: '#38bdf8', reviews: '#fbbf24', quickcommerce: '#fb7185',
};

export default function Pipeline() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [ytUrl, setYtUrl] = useState('https://www.youtube.com/watch?v=Tev_3DymaOE');
  const [ytTriggering, setYtTriggering] = useState(false);

  const refreshStatus = () => {
    setLoading(true);
    api.pipeline.status()
      .then(setData)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleTrigger = async () => {
    setTriggering(true);
    setRunResult(null);
    try {
      const res = await api.pipeline.trigger();
      setRunResult(res);
      const latest = await api.pipeline.status();
      setData(latest);
    } catch (err: any) {
      alert(`Scraping run failed: ${err.message || err}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleYtTrigger = async () => {
    setYtTriggering(true);
    setRunResult(null);
    try {
      const res = await api.pipeline.triggerYouTube(ytUrl);
      setRunResult(res);
      const latest = await api.pipeline.status();
      setData(latest);
    } catch (err: any) {
      alert(`YouTube scraping failed: ${err.message || err}`);
    } finally {
      setYtTriggering(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading pipeline status...</span></div>;
  if (!data) return null;

  return (
    <div className="animate-fade-in">
      {/* Control bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--text-secondary)' }}>Ingestion Orchestration</h3>
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Trigger dynamic web scrapers and analyze user feedback on demand</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary btn-sm" onClick={refreshStatus} disabled={triggering || ytTriggering}>
            Refresh Status
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleTrigger} disabled={triggering || ytTriggering}>
            {triggering ? 'Running Scrapers & AI...' : 'Trigger Full Ingestion (Reddit + Default Video)'}
          </button>
        </div>
      </div>

      {/* YouTube Video Ingest Card */}
      <div className="card mb-md" style={{ padding: '14px 18px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.03) 100%)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: 'var(--font-sm)', color: '#ef4444' }}>
              <span>▶ YouTube Video Comment Ingester</span>
            </div>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
              Default video prefilled: <code style={{ color: 'var(--accent-cyan)' }}>https://www.youtube.com/watch?v=Tev_3DymaOE</code>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '300px', maxWidth: '580px' }}>
            <input
              type="text"
              className="input"
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=Tev_3DymaOE)"
              style={{ fontSize: 'var(--font-xs)', padding: '6px 12px', flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              className="btn btn-sm"
              onClick={handleYtTrigger}
              disabled={ytTriggering || triggering}
              style={{ background: '#ef4444', color: 'white', border: 'none', whiteSpace: 'nowrap', padding: '6px 16px', fontWeight: 600 }}
            >
              {ytTriggering ? 'Scraping Video...' : 'Scrape Comments'}
            </button>
          </div>
        </div>
      </div>


      {runResult && (
        <div className="card mb-md animate-slide-up" style={{ borderLeft: '3px solid var(--accent-emerald)', padding: '16px' }}>
          <h4 style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: 'var(--positive)', marginBottom: 8 }}>✓ Ingestion & AI Analysis Run Complete</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <div>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Fetched</span>
              <div style={{ fontSize: 'var(--font-md)', fontWeight: 700 }}>{runResult.fetched}</div>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Processed</span>
              <div style={{ fontSize: 'var(--font-md)', fontWeight: 700 }}>{runResult.processed}</div>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Errors</span>
              <div style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: runResult.errors > 0 ? 'var(--negative)' : 'var(--positive)' }}>{runResult.errors}</div>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Scraped Subreddits</span>
              <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>r/grocery, Blinkit, etc.</div>
            </div>
          </div>
          {runResult.log && (
            <pre style={{ marginTop: 12, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 6, fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {runResult.log}
            </pre>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-indigo-light)' }}>
            {data.stats.totalDocuments.toLocaleString()}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Total Documents</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-emerald)' }}>
            {data.stats.documentsToday}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Ingested Today</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {data.stats.documentsThisWeek}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>This Week</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: Number(data.stats.errorRate) > 5 ? 'var(--negative)' : 'var(--positive)' }}>
            {data.stats.errorRate}%
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Error Rate</div>
        </div>
      </div>

      {/* Ingestion Rate Chart */}
      {data.hourlyRate?.length > 0 && (
        <div className="card mb-lg">
          <div className="card-header">
            <span className="card-title">Hourly Ingestion Rate (48h)</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.hourlyRate}>
              <defs>
                <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => v?.slice(11, 16)} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }} />
              <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="url(#rateGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Source Status Cards */}
      <div className="section-title">Source Status</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
        {Object.entries(data.sources).map(([source, run]: [string, any]) => {
          const status = run.status === 'completed' ? 'active' : run.errors > 0 ? 'warning' : 'error';
          const StatusIcon = status === 'active' ? CheckCircle : status === 'warning' ? AlertTriangle : XCircle;
          const statusColor = status === 'active' ? 'var(--positive)' : status === 'warning' ? 'var(--neutral)' : 'var(--negative)';

          return (
            <div key={source} className="card" style={{
              borderLeft: `3px solid ${SOURCE_COLORS[source] || 'var(--border-primary)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <div className={`status-dot ${status}`} />
                  <span style={{ fontWeight: 700, fontSize: 'var(--font-md)' }}>
                    {SOURCE_LABELS[source] || source}
                  </span>
                </div>
                <StatusIcon size={18} style={{ color: statusColor }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Fetched</div>
                  <div style={{ fontSize: 'var(--font-md)', fontWeight: 700 }}>{run.documents_fetched}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Processed</div>
                  <div style={{ fontSize: 'var(--font-md)', fontWeight: 700 }}>{run.documents_processed}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Errors</div>
                  <div style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: run.errors > 0 ? 'var(--negative)' : 'var(--positive)' }}>
                    {run.errors}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Status</div>
                  <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: statusColor, textTransform: 'capitalize' }}>
                    {run.status}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                Last run: {run.completed_at ? new Date(run.completed_at).toLocaleString() : 'N/A'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
