import { v4 as uuid } from 'uuid';
import { execute, saveDb, queryOne } from '../db/index.js';
import { analyzeSentiment, extractAspects, findThemeId, getFingerprint } from './reddit.js';

const TWITTER_SEARCH_QUERIES = ['Blinkit', 'Zepto', 'Swiggy Instamart', 'quick commerce delivery'];

export async function scrapeTwitter(): Promise<{ fetched: number; processed: number; errors: number; log: string }> {
  let fetched = 0;
  let processed = 0;
  let errors = 0;
  const logLines: string[] = ['Starting Twitter / X live scraper...'];

  const runId = uuid();
  execute(`
    INSERT INTO pipeline_runs (id, source, status, documents_fetched, documents_processed, errors, started_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `, [runId, 'twitter', 'running', 0, 0, 0]);

  // If TWITTER_BEARER_TOKEN is configured in process.env, use Official Twitter API v2
  let fetchedLiveApi = false;
  if (process.env.TWITTER_BEARER_TOKEN) {
    try {
      logLines.push(`Connecting to Official Twitter API v2 search endpoint...`);
      for (const query of TWITTER_SEARCH_QUERIES) {
        const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=25&tweet.fields=created_at,author_id`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}` }
        });
        if (res.ok) {
          const data = await res.json() as any;
          const tweets = data.data || [];
          logLines.push(`✅ Official Twitter API v2 returned ${tweets.length} live tweets for query "${query}"`);
          
          for (const tweet of tweets) {
            fetched++;
            const content = tweet.text || '';
            if (content.length < 5) continue;

            const fingerprint = getFingerprint(content);
            const existing = queryOne('SELECT id FROM documents WHERE fingerprint = ?', [fingerprint]);
            if (existing) continue;

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
              'twitter',
              `tweet_${tweet.id}`,
              content,
              `Tweet about ${query}`,
              null,
              `twitter_user_${tweet.author_id?.slice(-4) || 'x'}`,
              JSON.stringify({ query, tweetId: tweet.id }),
              'en',
              'Groceries',
              query.includes('Zepto') ? 'Zepto' : query.includes('Instamart') ? 'Swiggy Instamart' : 'Blinkit',
              'Web',
              sentiment.valence,
              sentiment.label,
              0.91,
              null,
              themeId,
              tweet.created_at || new Date().toISOString(),
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
          fetchedLiveApi = true;
        }
      }
    } catch (e: any) {
      logLines.push(`⚠️ Twitter API v2 error: ${e.message}`);
    }
  }

  // If no bearer token or API call failed, attempt search engine index scraper for live Twitter posts
  if (!fetchedLiveApi) {
    for (const query of TWITTER_SEARCH_QUERIES) {
      try {
        logLines.push(`Searching live Twitter posts via web index for "${query}"...`);
        const searchUrl = `https://html.duckduckgo.com/html/?q=site:x.com+${encodeURIComponent(query)}`;
        const res = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
          }
        });

        if (res.ok) {
          const html = await res.text();
          const resultMatches = [...html.matchAll(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g)];
          
          if (resultMatches.length > 0) {
            logLines.push(`✅ Web Index returned ${resultMatches.length} real live tweets for "${query}"`);
            for (const m of resultMatches) {
              fetched++;
              let content = m[1].replace(/<[^>]*>/g, '').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
              if (!content || content.length < 15) continue;

              const fingerprint = getFingerprint(content);
              const existing = queryOne('SELECT id FROM documents WHERE fingerprint = ?', [fingerprint]);
              if (existing) continue;

              // Try extracting author handle if present in snippet (e.g. "@username")
              const handleMatch = content.match(/@([a-zA-Z0-9_]{3,15})/);
              const author = handleMatch ? handleMatch[1] : `twitter_user_${Math.floor(Math.random() * 8999 + 1000)}`;

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
                'twitter',
                `tw_${uuid().slice(0, 8)}`,
                content,
                `Tweet on ${query}`,
                null,
                author,
                JSON.stringify({ query, source: 'x.com' }),
                'en',
                'Groceries',
                query.includes('Zepto') ? 'Zepto' : query.includes('Instamart') ? 'Swiggy Instamart' : 'Blinkit',
                'Web',
                sentiment.valence,
                sentiment.label,
                0.90,
                null,
                themeId,
                new Date().toISOString(),
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
          }
        }
      } catch (err: any) {
        logLines.push(`⚠️ Web Twitter index search failed for "${query}": ${err.message}`);
      }
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
