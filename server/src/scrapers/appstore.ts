import { v4 as uuid } from 'uuid';
import store from 'app-store-scraper';
import { execute, saveDb, queryOne } from '../db/index.js';
import { analyzeSentiment, extractAspects, findThemeId, getFingerprint } from './reddit.js';

const TARGET_IOS_APPS = [
  { name: 'Zepto', id: 1575323645, product: 'Zepto' },
  { name: 'Blinkit', id: 1058828858, product: 'Blinkit' },
  { name: 'Swiggy Instamart', id: 989580856, product: 'Swiggy Instamart' },
  { name: 'BigBasket', id: 660411798, product: 'BigBasket' },
  { name: 'JioMart', id: 1490212351, product: 'JioMart' }
];

export async function scrapeAppStore(): Promise<{ fetched: number; processed: number; errors: number; log: string }> {
  let fetched = 0;
  let processed = 0;
  let errors = 0;
  const logLines: string[] = ['Starting Apple App Store live scraper...'];

  const runId = uuid();
  execute(`
    INSERT INTO pipeline_runs (id, source, status, documents_fetched, documents_processed, errors, started_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `, [runId, 'appstore', 'running', 0, 0, 0]);

  for (const app of TARGET_IOS_APPS) {
    logLines.push(`Fetching App Store reviews for ${app.name} (iTunes ID: ${app.id})...`);
    try {
      // First try iTunes RSS API direct endpoint
      let reviews: any[] = [];
      const rssUrl = `https://itunes.apple.com/in/rss/customerreviews/id=${app.id}/sortBy=mostRecent/json`;
      const rssRes = await fetch(rssUrl);

      if (rssRes.ok) {
        const data = await rssRes.json() as any;
        const entries = data.feed?.entry || [];
        if (entries.length > 0) {
          reviews = entries.map((e: any) => ({
            id: e.id?.label || uuid(),
            userName: e.author?.name?.label || 'appstore_user',
            score: parseInt(e['im:rating']?.label || '5', 10),
            title: e.title?.label || '',
            text: e.content?.label || '',
            updated: e.updated?.label || new Date().toISOString()
          }));
        }
      }

      // If RSS endpoint yielded no entries, try app-store-scraper package fallback
      if (reviews.length === 0) {
        reviews = await store.reviews({
          id: app.id,
          country: 'in',
          sort: store.sort.RECENT,
          page: 1
        });
      }

      logLines.push(`✅ Fetched ${reviews.length} live App Store reviews for ${app.name}`);

      for (const r of reviews) {
        fetched++;
        const content = r.text ? (r.title ? `${r.title}\n\n${r.text}` : r.text) : '';
        if (!content || content.trim().length < 3) continue;

        const fingerprint = getFingerprint(content);
        const existing = queryOne('SELECT id FROM documents WHERE fingerprint = ?', [fingerprint]);
        if (existing) {
          logLines.push(`Skipping duplicate App Store review from ${r.userName}`);
          continue;
        }

        const docId = uuid();
        const sentiment = analyzeSentiment(content);
        const themeId = findThemeId(content);

        execute(`
          INSERT INTO documents (
            id, source, source_id, content, title, rating, author, author_meta,
            language, category, product, platform, sentiment_valence, sentiment_label,
            sentiment_confidence, topic_id, theme_id, created_at, ingested_at, fingerprint
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
        `, [
          docId,
          'appstore',
          `ios_${app.name}_${r.id || uuid().slice(0, 8)}`,
          content,
          r.title || `Apple App Store Review (${app.name})`,
          r.score || null,
          r.userName || 'appstore_user',
          JSON.stringify({ appId: app.id, score: r.score }),
          'en',
          'Groceries',
          app.product,
          'iOS',
          sentiment.valence,
          sentiment.label,
          0.93,
          null,
          themeId,
          r.updated ? new Date(r.updated).toISOString() : new Date().toISOString(),
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
      logLines.push(`❌ Error fetching App Store reviews for ${app.name}: ${err.message}`);
    }
  }

  execute(`
    UPDATE themes SET document_count = (SELECT COUNT(*) FROM documents WHERE documents.theme_id = themes.id)
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
