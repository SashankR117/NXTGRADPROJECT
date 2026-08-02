import { v4 as uuid } from 'uuid';
import gplay from 'google-play-scraper';
import { execute, saveDb, queryOne } from '../db/index.js';
import { analyzeSentiment, extractAspects, findThemeId, findTopicId, getFingerprint } from './reddit.js';

const TARGET_APPS = [
  { name: 'Blinkit', appId: 'com.grofers.customerapp', product: 'Blinkit' },
  { name: 'Zepto', appId: 'com.zeptoconsumerapp', product: 'Zepto' },
  { name: 'Swiggy Instamart', appId: 'in.swiggy.android', product: 'Swiggy Instamart' },
  { name: 'BigBasket', appId: 'com.bigbasket.mobileapp', product: 'BigBasket' },
  { name: 'JioMart', appId: 'com.jio.jiomart', product: 'JioMart' }
];

export async function scrapePlayStore(numPerApp: number = 20): Promise<{ fetched: number; processed: number; errors: number; log: string }> {
  let fetched = 0;
  let processed = 0;
  let errors = 0;
  const logLines: string[] = ['Starting Google Play Store live scraper...'];

  const runId = uuid();
  execute(`
    INSERT INTO pipeline_runs (id, source, status, documents_fetched, documents_processed, errors, started_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `, [runId, 'playstore', 'running', 0, 0, 0]);

  for (const app of TARGET_APPS) {
    logLines.push(`Fetching Play Store reviews for ${app.name} (${app.appId})...`);
    try {
      const res = await gplay.reviews({
        appId: app.appId,
        sort: (gplay.sort as any)?.NEW || 2,
        num: numPerApp
      });

      const reviews = res.data || [];
      logLines.push(`✅ Fetched ${reviews.length} live Play Store reviews for ${app.name}`);

      for (const r of reviews) {
        fetched++;
        const content = r.text ? (r.title ? `${r.title}\n\n${r.text}` : r.text) : '';
        if (!content || content.trim().length < 3) continue;

        const fingerprint = getFingerprint(content);

        const existing = queryOne('SELECT id FROM documents WHERE fingerprint = ?', [fingerprint]);
        if (existing) {
          logLines.push(`Skipping duplicate Play Store review from ${r.userName}`);
          continue;
        }

        const docId = uuid();
        const sentiment = analyzeSentiment(content);
        const themeId = findThemeId(content);
        const topicId = findTopicId(content, themeId);

        execute(`
          INSERT INTO documents (
            id, source, source_id, content, title, rating, author, author_meta,
            language, category, product, platform, sentiment_valence, sentiment_label,
            sentiment_confidence, topic_id, theme_id, created_at, ingested_at, fingerprint
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
        `, [
          docId,
          'playstore',
          `play_${app.name}_${r.id || uuid().slice(0, 8)}`,
          content,
          r.title || `Google Play Store Review (${app.name})`,
          r.score || null,
          r.userName || 'playstore_user',
          JSON.stringify({ appId: app.appId, score: r.score, version: r.version || 'latest' }),
          'en',
          'Groceries',
          app.product,
          'Android',
          sentiment.valence,
          sentiment.label,
          0.92,
          topicId,
          themeId,
          r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
          fingerprint
        ]);

        const aspects = extractAspects(content);
        for (const aspect of aspects) {
          execute(`
            INSERT INTO aspects (id, document_id, aspect_name, sentiment, snippet, confidence)
            VALUES (?, ?, ?, ?, ?, 0.88)
          `, [uuid(), docId, aspect.name, aspect.sentiment, aspect.snippet]);
        }

        processed++;
      }
    } catch (err: any) {
      errors++;
      logLines.push(`❌ Error fetching Play Store reviews for ${app.name}: ${err.message}`);
    }
  }

  execute(`
    UPDATE themes SET document_count = (SELECT COUNT(*) FROM documents WHERE documents.theme_id = themes.id)
  `);
  execute(`
    UPDATE topics SET document_count = (SELECT COUNT(*) FROM documents WHERE documents.topic_id = topics.id)
  `);

  const logStr = logLines.join('\n');
  execute(`
    UPDATE pipeline_runs
    SET status = 'completed', documents_fetched = ?, documents_processed = ?, errors = ?, completed_at = datetime('now'), log = ?
    WHERE id = ?
  `, [fetched, processed, errors, logStr, runId]);

  saveDb();

  return { fetched, processed, errors, log: logStr };
}
