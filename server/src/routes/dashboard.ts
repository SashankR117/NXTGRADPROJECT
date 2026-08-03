import { Router } from 'express';
import { queryAll, queryOne } from '../db/index.js';

export const dashboardRouter = Router();

// ─── Overview ─────────────────────────────────────────────────

dashboardRouter.get('/overview', (_req, res) => {
  try {
    const totalDocs = queryOne('SELECT COUNT(*) as count FROM documents')?.count || 0;
    const totalThemes = queryOne('SELECT COUNT(*) as count FROM themes')?.count || 0;
    const totalInsights = queryOne('SELECT COUNT(*) as count FROM insights')?.count || 0;
    const avgSentiment = queryOne('SELECT AVG(sentiment_valence) as avg FROM documents')?.avg || 0;
    const sourcesActive = queryOne('SELECT COUNT(DISTINCT source) as count FROM documents')?.count || 0;

    const sentimentDist = queryAll(`
      SELECT sentiment_label as label, COUNT(*) as count FROM documents GROUP BY sentiment_label
    `);

    const volumeBySource = queryAll(`
      SELECT source, COUNT(*) as count FROM documents GROUP BY source ORDER BY count DESC
    `);

    const sentimentTrend = queryAll(`
      SELECT date(created_at) as date, AVG(sentiment_valence) as avg_sentiment, COUNT(*) as volume
      FROM documents WHERE created_at >= datetime('now', '-60 days')
      GROUP BY date(created_at) ORDER BY date ASC
    `);

    const topThemes = queryAll(`
      SELECT t.*,
        (SELECT AVG(d.sentiment_valence) FROM documents d WHERE d.theme_id = t.id AND d.created_at >= datetime('now', '-7 days')) as recent_sentiment,
        (SELECT COUNT(*) FROM documents d WHERE d.theme_id = t.id AND d.created_at >= datetime('now', '-7 days')) as recent_count
      FROM themes t ORDER BY t.document_count DESC LIMIT 5
    `);

    const latestInsights = queryAll(`
      SELECT i.*, th.name as theme_name FROM insights i LEFT JOIN themes th ON i.theme_id = th.id
      ORDER BY i.confidence DESC LIMIT 5
    `);

    const aspectData = queryAll(`
      SELECT aspect_name, sentiment, COUNT(*) as count FROM aspects
      GROUP BY aspect_name, sentiment ORDER BY count DESC LIMIT 50
    `);

    res.json({
      kpis: { totalDocuments: totalDocs, activeThemes: totalThemes, avgSentiment: Math.round((avgSentiment || 0) * 100) / 100, sourcesActive, totalInsights },
      sentimentDistribution: sentimentDist,
      volumeBySource,
      sentimentTrend,
      topThemes,
      latestInsights,
      aspectHeatmap: aspectData,
    });
  } catch (err) {
    console.error('Overview error:', err);
    res.status(500).json({ error: 'Failed to fetch overview data' });
  }
});

// ─── Themes ───────────────────────────────────────────────────

dashboardRouter.get('/themes', (_req, res) => {
  try {
    const themes = queryAll('SELECT t.*, (SELECT AVG(d.sentiment_valence) FROM documents d WHERE d.theme_id = t.id) as avg_sentiment FROM themes t ORDER BY t.document_count DESC');
    const topics = queryAll('SELECT tp.*, th.name as theme_name FROM topics tp LEFT JOIN themes th ON tp.theme_id = th.id ORDER BY tp.document_count DESC');
    res.json({ themes, topics });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch themes' }); }
});

dashboardRouter.get('/themes/:id', (req, res) => {
  try {
    const theme = queryOne('SELECT * FROM themes WHERE id = ?', [Number(req.params.id)]);
    if (!theme) return res.status(404).json({ error: 'Theme not found' });
    const topics = queryAll('SELECT * FROM topics WHERE theme_id = ?', [Number(req.params.id)]);
    const documents = queryAll('SELECT * FROM documents WHERE theme_id = ? ORDER BY created_at DESC LIMIT 20', [Number(req.params.id)]);
    const insights = queryAll('SELECT * FROM insights WHERE theme_id = ? ORDER BY confidence DESC', [Number(req.params.id)]);
    const sourceDist = queryAll('SELECT source, COUNT(*) as count FROM documents WHERE theme_id = ? GROUP BY source', [Number(req.params.id)]);
    const sentimentTrend = queryAll(`
      SELECT date(created_at) as date, AVG(sentiment_valence) as avg_sentiment, COUNT(*) as volume
      FROM documents WHERE theme_id = ? AND created_at >= datetime('now', '-60 days')
      GROUP BY date(created_at) ORDER BY date ASC
    `, [Number(req.params.id)]);
    res.json({ theme, topics, documents, insights, sourceDistribution: sourceDist, sentimentTrend });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch theme details' }); }
});

// ─── Insights ─────────────────────────────────────────────────

dashboardRouter.get('/insights', (req, res) => {
  try {
    const { question, minConfidence, actionability, segment } = req.query;
    let query = 'SELECT i.*, th.name as theme_name FROM insights i LEFT JOIN themes th ON i.theme_id = th.id WHERE 1=1';
    const params: any[] = [];

    if (question && question !== 'all') { query += ' AND i.strategic_question = ?'; params.push(question); }
    if (minConfidence) { query += ' AND i.confidence >= ?'; params.push(Number(minConfidence)); }
    if (actionability && actionability !== 'all') { query += ' AND i.actionability = ?'; params.push(actionability); }
    query += ' ORDER BY i.confidence DESC';

    let insights = queryAll(query, params);

    if (segment && segment !== 'all') {
      insights = insights.filter((i: any) => {
        const segs = JSON.parse(i.user_segments || '[]');
        return segs.some((s: string) => s.toLowerCase().includes((segment as string).toLowerCase()));
      });
    }

    insights = insights.map((insight: any) => ({
      ...insight,
      evidence: queryAll('SELECT * FROM evidence WHERE insight_id = ?', [insight.id]),
      user_segments: JSON.parse(insight.user_segments || '[]'),
      source_types: JSON.parse(insight.source_types || '[]'),
    }));

    const questions = queryAll('SELECT DISTINCT strategic_question FROM insights');
    res.json({ insights, questions });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// ─── Sources ──────────────────────────────────────────────────

dashboardRouter.get('/sources', (_req, res) => {
  try {
    const sources = queryAll(`
      SELECT source, COUNT(*) as total, AVG(sentiment_valence) as avg_sentiment,
        SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) as negative_count,
        SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
        SUM(CASE WHEN sentiment_label = 'mixed' THEN 1 ELSE 0 END) as mixed_count
      FROM documents GROUP BY source
    `);

    const sourceAspects: Record<string, any[]> = {};
    const sourceTrends: Record<string, any[]> = {};
    for (const s of sources) {
      sourceAspects[s.source] = queryAll(`
        SELECT a.aspect_name, a.sentiment, COUNT(*) as count FROM aspects a
        JOIN documents d ON a.document_id = d.id WHERE d.source = ?
        GROUP BY a.aspect_name, a.sentiment ORDER BY count DESC LIMIT 10
      `, [s.source]);
      sourceTrends[s.source] = queryAll(`
        SELECT date(created_at) as date, COUNT(*) as volume FROM documents WHERE source = ?
        GROUP BY date(created_at) ORDER BY date ASC
      `, [s.source]);
    }

    res.json({ sources, sourceAspects, sourceTrends });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch sources' }); }
});

// ─── Explorer (Search) ───────────────────────────────────────

dashboardRouter.get('/explorer', (req, res) => {
  try {
    const { q, source, sentiment, category, theme, page = '1', limit = '20' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = '1=1';
    const params: any[] = [];

    if (q && (q as string).trim()) {
      where += ' AND d.content LIKE ?';
      params.push(`%${q}%`);
    }
    if (source && source !== 'all') { where += ' AND d.source = ?'; params.push(source); }
    if (sentiment && sentiment !== 'all') { where += ' AND d.sentiment_label = ?'; params.push(sentiment); }
    if (category && category !== 'all') { where += ' AND d.category = ?'; params.push(category); }
    if (theme && theme !== 'all') { where += ' AND d.theme_id = ?'; params.push(Number(theme)); }

    const total = queryOne(`SELECT COUNT(*) as count FROM documents d WHERE ${where}`, params)?.count || 0;

    const documents = queryAll(`
      SELECT d.*, th.name as theme_name FROM documents d
      LEFT JOIN themes th ON d.theme_id = th.id
      WHERE ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]).map(doc => ({
      ...doc,
      aspects: queryAll('SELECT * FROM aspects WHERE document_id = ?', [doc.id]),
    }));

    const categories = queryAll('SELECT DISTINCT category FROM documents WHERE category IS NOT NULL ORDER BY category');
    const themes = queryAll('SELECT id, name FROM themes ORDER BY name');

    res.json({ documents, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), filters: { categories, themes } });
  } catch (err) {
    console.error('Explorer error:', err);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

// ─── Trends ───────────────────────────────────────────────────

dashboardRouter.get('/trends', (_req, res) => {
  try {
    const themeTimelines = queryAll(`
      SELECT th.id as theme_id, th.name as theme_name, date(d.created_at) as date, COUNT(*) as volume, AVG(d.sentiment_valence) as avg_sentiment
      FROM documents d JOIN themes th ON d.theme_id = th.id
      WHERE d.created_at >= datetime('now', '-60 days')
      GROUP BY th.id, date(d.created_at) ORDER BY date ASC
    `);

    const emerging = queryAll(`
      SELECT tp.label, tp.keywords, th.name as theme_name,
        (SELECT COUNT(*) FROM documents d WHERE d.topic_id = tp.id AND d.created_at >= datetime('now', '-7 days')) as recent_count,
        (SELECT COUNT(*) FROM documents d WHERE d.topic_id = tp.id AND d.created_at >= datetime('now', '-14 days') AND d.created_at < datetime('now', '-7 days')) as prior_count
      FROM topics tp JOIN themes th ON tp.theme_id = th.id ORDER BY recent_count DESC LIMIT 10
    `);

    const sentimentShifts = queryAll(`
      SELECT th.name as theme_name, th.id as theme_id,
        (SELECT AVG(d.sentiment_valence) FROM documents d WHERE d.theme_id = th.id AND d.created_at >= datetime('now', '-7 days')) as recent_sentiment,
        (SELECT AVG(d.sentiment_valence) FROM documents d WHERE d.theme_id = th.id AND d.created_at >= datetime('now', '-30 days') AND d.created_at < datetime('now', '-7 days')) as prior_sentiment
      FROM themes th
    `);

    res.json({ themeTimelines, emerging, sentimentShifts });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch trends' }); }
});

// ─── Segments ─────────────────────────────────────────────────

dashboardRouter.get('/segments', (_req, res) => {
  try {
    const segments = [
      { name: 'Weekly Grocery Buyers', size: 45, description: 'Regular weekly shoppers who prioritize convenience and routine', exploration: 15, categoryDiversity: 20, sentiment: 62, engagement: 78, reviewFrequency: 45, topThemes: ['Habitual Reordering', 'Routine & Convenience'], topFrustrations: ['Delivery delays', 'Price increases'] },
      { name: 'Power Explorers', size: 12, description: 'Adventurous users actively seeking new products and categories', exploration: 92, categoryDiversity: 85, sentiment: 74, engagement: 95, reviewFrequency: 80, topThemes: ['Power User Exploration', 'Product Discovery Channels'], topFrustrations: ['Limited variety', 'Poor search'] },
      { name: 'Deal Hunters', size: 18, description: 'Price-sensitive shoppers driven by discounts and offers', exploration: 55, categoryDiversity: 50, sentiment: 48, engagement: 70, reviewFrequency: 60, topThemes: ['Pricing & Value Perception', 'Power User Exploration'], topFrustrations: ['High prices', 'Delivery fees'] },
      { name: 'Health-Conscious Buyers', size: 10, description: 'Users focused on organic, natural, and health-focused products', exploration: 65, categoryDiversity: 55, sentiment: 52, engagement: 75, reviewFrequency: 55, topThemes: ['Trust & Information Gaps', 'Unmet Feature Requests'], topFrustrations: ['No dietary filters', 'Missing nutritional info'] },
      { name: 'Busy Parents', size: 15, description: 'Time-constrained parents prioritizing speed and reliability', exploration: 20, categoryDiversity: 35, sentiment: 58, engagement: 85, reviewFrequency: 35, topThemes: ['Routine & Convenience', 'Delivery & Freshness Frustrations'], topFrustrations: ['Substitutions', 'Quality inconsistency'] },
    ];
    res.json({ segments });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch segments' }); }
});

// ─── Aspects ──────────────────────────────────────────────────

dashboardRouter.get('/aspects', (_req, res) => {
  try {
    const aspects = queryAll('SELECT aspect_name, sentiment, COUNT(*) as count, AVG(confidence) as avg_confidence FROM aspects GROUP BY aspect_name, sentiment ORDER BY count DESC');
    res.json({ aspects });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch aspects' }); }
});

// ─── Export Utilities & Routes ───────────────────────────────

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

dashboardRouter.get('/export/insights', (req, res) => {
  try {
    const insights = queryAll(`
      SELECT i.*, th.name as theme_name 
      FROM insights i 
      LEFT JOIN themes th ON i.theme_id = th.id 
      ORDER BY i.confidence DESC
    `);

    const headers = [
      'Insight ID',
      'Strategic Question',
      'Insight Text',
      'Theme',
      'Recommendation',
      'Actionability',
      'Confidence (%)',
      'User Segments',
      'Source Types',
      'Evidence Quotes'
    ];

    const rows = insights.map((insight: any) => {
      const evidence = queryAll('SELECT quote, source FROM evidence WHERE insight_id = ?', [insight.id]);
      const evidenceQuotes = evidence.map((e: any) => `[${e.source}] "${e.quote}"`).join(' | ');
      let segments = '';
      try { segments = JSON.parse(insight.user_segments || '[]').join(', '); } catch { segments = insight.user_segments || ''; }
      let sources = '';
      try { sources = JSON.parse(insight.source_types || '[]').join(', '); } catch { sources = insight.source_types || ''; }

      return [
        insight.id,
        insight.strategic_question || 'N/A',
        insight.insight_text,
        insight.theme_name || 'General',
        insight.recommendation || '',
        insight.actionability || 'medium',
        Math.round((insight.confidence || 0) * 100),
        segments,
        sources,
        evidenceQuotes
      ].map(escapeCsvCell).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="strategic_insights_export.csv"');
    res.send(csvContent);
  } catch (err) {
    console.error('Insights CSV export error:', err);
    res.status(500).json({ error: 'Failed to export insights CSV' });
  }
});

dashboardRouter.get('/export/documents', (req, res) => {
  try {
    const { source, sentiment, q } = req.query;
    let where = '1=1';
    const params: any[] = [];

    if (q && (q as string).trim()) {
      where += ' AND d.content LIKE ?';
      params.push(`%${q}%`);
    }
    if (source && source !== 'all') {
      where += ' AND d.source = ?';
      params.push(source);
    }
    if (sentiment && sentiment !== 'all') {
      where += ' AND d.sentiment_label = ?';
      params.push(sentiment);
    }

    const documents = queryAll(`
      SELECT d.*, th.name as theme_name 
      FROM documents d 
      LEFT JOIN themes th ON d.theme_id = th.id 
      WHERE ${where}
      ORDER BY d.created_at DESC
    `, params);

    const headers = [
      'Document ID',
      'Source',
      'Category',
      'Product',
      'Platform',
      'Title',
      'Content',
      'Rating',
      'Sentiment Label',
      'Sentiment Valence',
      'Theme',
      'Aspects',
      'Author',
      'Created At'
    ];

    const rows = documents.map((doc: any) => {
      const aspects = queryAll('SELECT aspect_name, sentiment FROM aspects WHERE document_id = ?', [doc.id]);
      const aspectStr = aspects.map((a: any) => `${a.aspect_name} (${a.sentiment})`).join('; ');

      return [
        doc.id,
        doc.source,
        doc.category || '',
        doc.product || '',
        doc.platform || '',
        doc.title || '',
        doc.content,
        doc.rating !== null && doc.rating !== undefined ? doc.rating : '',
        doc.sentiment_label || 'neutral',
        doc.sentiment_valence !== null && doc.sentiment_valence !== undefined ? doc.sentiment_valence : '',
        doc.theme_name || 'Unassigned',
        aspectStr,
        doc.author || '',
        doc.created_at || ''
      ].map(escapeCsvCell).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="collected_feedback_export.csv"');
    res.send(csvContent);
  } catch (err) {
    console.error('Documents CSV export error:', err);
    res.status(500).json({ error: 'Failed to export documents CSV' });
  }
});

dashboardRouter.get('/export/full-report', (req, res) => {
  try {
    const totalDocs = queryOne('SELECT COUNT(*) as count FROM documents')?.count || 0;
    const totalThemes = queryOne('SELECT COUNT(*) as count FROM themes')?.count || 0;
    const totalInsights = queryOne('SELECT COUNT(*) as count FROM insights')?.count || 0;
    const avgSentiment = queryOne('SELECT AVG(sentiment_valence) as avg FROM documents')?.avg || 0;

    const insights = queryAll(`
      SELECT i.*, th.name as theme_name 
      FROM insights i 
      LEFT JOIN themes th ON i.theme_id = th.id 
      ORDER BY i.confidence DESC
    `).map((insight: any) => ({
      ...insight,
      evidence: queryAll('SELECT quote, source FROM evidence WHERE insight_id = ?', [insight.id]),
      user_segments: JSON.parse(insight.user_segments || '[]'),
      source_types: JSON.parse(insight.source_types || '[]'),
    }));

    const topThemes = queryAll(`
      SELECT t.*, (SELECT AVG(d.sentiment_valence) FROM documents d WHERE d.theme_id = t.id) as recent_sentiment
      FROM themes t ORDER BY t.document_count DESC LIMIT 10
    `);

    const sources = queryAll(`
      SELECT source, COUNT(*) as total, AVG(sentiment_valence) as avg_sentiment
      FROM documents GROUP BY source
    `);

    res.json({
      exportedAt: new Date().toISOString(),
      summary: {
        totalDocuments: totalDocs,
        totalThemes,
        totalInsights,
        avgSentiment: Math.round((avgSentiment || 0) * 100) / 100,
      },
      sources,
      topThemes,
      insights,
    });
  } catch (err) {
    console.error('Full report export error:', err);
    res.status(500).json({ error: 'Failed to export full report' });
  }
});

