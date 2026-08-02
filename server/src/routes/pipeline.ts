import { Router } from 'express';
import { queryAll, queryOne } from '../db/index.js';
import { scrapeReddit } from '../scrapers/reddit.js';
import { scrapeYouTubeComments } from '../scrapers/youtube.js';
import { scrapePlayStore } from '../scrapers/playstore.js';
import { scrapeAppStore } from '../scrapers/appstore.js';
import { scrapeTwitter } from '../scrapers/twitter.js';

export const pipelineRouter = Router();

pipelineRouter.get('/status', (_req, res) => {
  try {
    const runs = queryAll('SELECT * FROM pipeline_runs ORDER BY started_at DESC');

    const sourceStatus: Record<string, any> = {};
    for (const run of runs) {
      if (!sourceStatus[run.source]) sourceStatus[run.source] = run;
    }

    const totalDocs = queryOne('SELECT COUNT(*) as count FROM documents')?.count || 0;
    const todayDocs = queryOne("SELECT COUNT(*) as count FROM documents WHERE ingested_at >= datetime('now', '-1 day')")?.count || 0;
    const thisWeekDocs = queryOne("SELECT COUNT(*) as count FROM documents WHERE ingested_at >= datetime('now', '-7 days')")?.count || 0;

    const hourlyRate = queryAll(`
      SELECT strftime('%Y-%m-%d %H:00', ingested_at) as hour, COUNT(*) as count
      FROM documents WHERE ingested_at >= datetime('now', '-48 hours')
      GROUP BY hour ORDER BY hour ASC
    `);

    const totalErrors = runs.reduce((sum: number, r: any) => sum + (r.errors || 0), 0);
    const totalFetched = runs.reduce((sum: number, r: any) => sum + (r.documents_fetched || 0), 0);

    res.json({
      sources: sourceStatus,
      stats: { totalDocuments: totalDocs, documentsToday: todayDocs, documentsThisWeek: thisWeekDocs, errorRate: totalFetched > 0 ? ((totalErrors / totalFetched) * 100).toFixed(2) : '0.00', totalErrors },
      hourlyRate,
    });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch pipeline status' }); }
});

// Trigger full pipeline across all live sources (Play Store, App Store, Reddit, YouTube, Twitter)
pipelineRouter.post('/trigger', async (_req, res) => {
  try {
    const [playResult, appResult, redditResult, ytResult, twResult] = await Promise.all([
      scrapePlayStore(20).catch(e => ({ fetched: 0, processed: 0, errors: 1, log: `PlayStore Error: ${e.message}` })),
      scrapeAppStore().catch(e => ({ fetched: 0, processed: 0, errors: 1, log: `AppStore Error: ${e.message}` })),
      scrapeReddit().catch(e => ({ fetched: 0, processed: 0, errors: 1, log: `Reddit Error: ${e.message}` })),
      scrapeYouTubeComments('https://www.youtube.com/watch?v=Tev_3DymaOE', 40).catch(e => ({ fetched: 0, processed: 0, errors: 1, log: `YouTube Error: ${e.message}` })),
      scrapeTwitter().catch(e => ({ fetched: 0, processed: 0, errors: 1, log: `Twitter Error: ${e.message}` }))
    ]);

    const totalFetched = playResult.fetched + appResult.fetched + redditResult.fetched + ytResult.fetched + twResult.fetched;
    const totalProcessed = playResult.processed + appResult.processed + redditResult.processed + ytResult.processed + twResult.processed;
    const totalErrors = playResult.errors + appResult.errors + redditResult.errors + ytResult.errors + twResult.errors;

    const fullLog = [
      `--- GOOGLE PLAY STORE SCRAPER ---\n${playResult.log}`,
      `--- APPLE APP STORE SCRAPER ---\n${appResult.log}`,
      `--- REDDIT SCRAPER ---\n${redditResult.log}`,
      `--- YOUTUBE SCRAPER ---\n${ytResult.log}`,
      `--- TWITTER SCRAPER ---\n${twResult.log}`
    ].join('\n\n');

    res.json({
      success: true,
      fetched: totalFetched,
      processed: totalProcessed,
      errors: totalErrors,
      log: fullLog
    });
  } catch (err: any) {
    console.error('Trigger scraping failed:', err);
    res.status(500).json({ error: err.message || 'Trigger scraping failed' });
  }
});

// Custom YouTube video scraper trigger
pipelineRouter.post('/trigger-youtube', async (req, res) => {
  try {
    const { videoUrl = 'https://www.youtube.com/watch?v=Tev_3DymaOE', limit = 40 } = req.body;
    const ytResult = await scrapeYouTubeComments(videoUrl, limit);
    res.json({ success: true, ...ytResult });
  } catch (err: any) {
    console.error('Custom YouTube scraping failed:', err);
    res.status(500).json({ error: err.message || 'YouTube scraping failed' });
  }
});

// Play Store scraper trigger
pipelineRouter.post('/trigger-playstore', async (req, res) => {
  try {
    const { num = 20 } = req.body;
    const result = await scrapePlayStore(num);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Play Store scraping failed' });
  }
});

// App Store scraper trigger
pipelineRouter.post('/trigger-appstore', async (_req, res) => {
  try {
    const result = await scrapeAppStore();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'App Store scraping failed' });
  }
});

// Twitter scraper trigger
pipelineRouter.post('/trigger-twitter', async (_req, res) => {
  try {
    const result = await scrapeTwitter();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Twitter scraping failed' });
  }
});
