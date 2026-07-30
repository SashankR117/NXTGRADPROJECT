import { Router } from 'express';
import { queryAll, queryOne } from '../db/index.js';
import { scrapeReddit } from '../scrapers/reddit.js';
import { scrapeYouTubeComments } from '../scrapers/youtube.js';
export const pipelineRouter = Router();
pipelineRouter.get('/status', (_req, res) => {
    try {
        const runs = queryAll('SELECT * FROM pipeline_runs ORDER BY started_at DESC');
        const sourceStatus = {};
        for (const run of runs) {
            if (!sourceStatus[run.source])
                sourceStatus[run.source] = run;
        }
        const totalDocs = queryOne('SELECT COUNT(*) as count FROM documents')?.count || 0;
        const todayDocs = queryOne("SELECT COUNT(*) as count FROM documents WHERE ingested_at >= datetime('now', '-1 day')")?.count || 0;
        const thisWeekDocs = queryOne("SELECT COUNT(*) as count FROM documents WHERE ingested_at >= datetime('now', '-7 days')")?.count || 0;
        const hourlyRate = queryAll(`
      SELECT strftime('%Y-%m-%d %H:00', ingested_at) as hour, COUNT(*) as count
      FROM documents WHERE ingested_at >= datetime('now', '-48 hours')
      GROUP BY hour ORDER BY hour ASC
    `);
        const totalErrors = runs.reduce((sum, r) => sum + (r.errors || 0), 0);
        const totalFetched = runs.reduce((sum, r) => sum + (r.documents_fetched || 0), 0);
        res.json({
            sources: sourceStatus,
            stats: { totalDocuments: totalDocs, documentsToday: todayDocs, documentsThisWeek: thisWeekDocs, errorRate: totalFetched > 0 ? ((totalErrors / totalFetched) * 100).toFixed(2) : '0.00', totalErrors },
            hourlyRate,
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch pipeline status' });
    }
});
// Trigger pipeline (runs Reddit + Default YouTube video comments by default)
pipelineRouter.post('/trigger', async (_req, res) => {
    try {
        const redditResult = await scrapeReddit();
        const ytResult = await scrapeYouTubeComments('https://www.youtube.com/watch?v=Tev_3DymaOE');
        res.json({
            success: true,
            fetched: redditResult.fetched + ytResult.fetched,
            processed: redditResult.processed + ytResult.processed,
            errors: redditResult.errors + ytResult.errors,
            log: `${redditResult.log}\n\n--- YOUTUBE SCRAPER (Default Video: Tev_3DymaOE) ---\n${ytResult.log}`
        });
    }
    catch (err) {
        console.error('Trigger scraping failed:', err);
        res.status(500).json({ error: err.message || 'Trigger scraping failed' });
    }
});
// Custom YouTube video scraper trigger
pipelineRouter.post('/trigger-youtube', async (req, res) => {
    try {
        const { videoUrl = 'https://www.youtube.com/watch?v=Tev_3DymaOE' } = req.body;
        const ytResult = await scrapeYouTubeComments(videoUrl);
        res.json({ success: true, ...ytResult });
    }
    catch (err) {
        console.error('Custom YouTube scraping failed:', err);
        res.status(500).json({ error: err.message || 'YouTube scraping failed' });
    }
});
//# sourceMappingURL=pipeline.js.map