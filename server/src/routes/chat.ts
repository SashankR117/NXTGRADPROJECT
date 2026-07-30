import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db/index.js';
import { v4 as uuid } from 'uuid';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  try {
    const { message, sessionId = uuid() } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    execute('INSERT INTO chat_history (id, session_id, role, content) VALUES (?, ?, ?, ?)', [uuid(), sessionId, 'user', message]);

    const context = retrieveContext(message);
    const response = await generateResponse(message, context);

    execute('INSERT INTO chat_history (id, session_id, role, content, citations) VALUES (?, ?, ?, ?, ?)',
      [uuid(), sessionId, 'assistant', response.content, JSON.stringify(response.citations)]);

    res.json({
      sessionId,
      message: response.content,
      citations: response.citations,
      context: { documentsSearched: context.documentsCount, themesReferenced: context.themes.length, insightsReferenced: context.insights.length },
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

chatRouter.get('/history', (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    res.json({ messages: queryAll('SELECT * FROM chat_history WHERE session_id = ? ORDER BY created_at ASC', [sessionId as string]) });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch chat history' }); }
});

chatRouter.get('/suggestions', (_req, res) => {
  res.json({
    suggestions: [
      "Why do users keep buying from the same grocery categories?",
      "What prevents users from exploring new product categories?",
      "How do users discover new products today?",
      "What role do habits play in shopping behavior?",
      "What information do users need before trying a new category?",
      "What are the top frustrations mentioned across all platforms?",
      "Which user segments are most likely to experiment with new products?",
      "What unmet needs keep appearing in user feedback?",
      "Compare sentiment across App Store vs Play Store reviews",
      "What do power users say about product discovery?",
      "Summarize the key themes from Reddit discussions",
      "What specific recommendations can improve category exploration?",
    ]
  });
});

interface RetrievedContext {
  documents: any[];
  documentsCount: number;
  themes: any[];
  insights: any[];
  aspects: any[];
}

function retrieveContext(query: string): RetrievedContext {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let documents: any[] = [];

  for (const word of queryWords.slice(0, 3)) {
    const results = queryAll(`
      SELECT d.*, th.name as theme_name FROM documents d
      LEFT JOIN themes th ON d.theme_id = th.id WHERE d.content LIKE ? LIMIT 10
    `, [`%${word}%`]);
    for (const doc of results) {
      if (!documents.find(d => d.id === doc.id)) documents.push(doc);
    }
    if (documents.length >= 20) break;
  }
  documents = documents.slice(0, 20);

  return {
    documents,
    documentsCount: queryOne('SELECT COUNT(*) as count FROM documents')?.count || 0,
    themes: queryAll('SELECT * FROM themes ORDER BY document_count DESC'),
    insights: queryAll('SELECT i.*, th.name as theme_name FROM insights i LEFT JOIN themes th ON i.theme_id = th.id ORDER BY i.confidence DESC'),
    aspects: queryAll('SELECT aspect_name, sentiment, COUNT(*) as count FROM aspects GROUP BY aspect_name, sentiment ORDER BY count DESC LIMIT 20'),
  };
}

function isValidGeminiKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  if (k.length < 10) return false;
  if (k.startsWith('AQ.')) return false; // OAuth bearer token format, not Gemini API key
  if (k.startsWith('ya29.')) return false; // Google OAuth access token
  if (k.includes('YOUR_') || k.includes('PLACEHOLDER') || k.includes('XXX')) return false;
  return true;
}

function isValidClaudeKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  if (k.length < 10) return false;
  if (k.includes('YOUR_') || k.includes('PLACEHOLDER')) return false;
  return true;
}

async function generateResponse(query: string, context: RetrievedContext): Promise<{ content: string; citations: any[] }> {
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (isValidGeminiKey(geminiApiKey)) {
    try {
      return await generateGeminiResponse(query, context, geminiApiKey!);
    } catch (e: any) {
      console.warn('⚠️ Gemini API call failed, falling back to local engine:', e.message || e);
    }
  }

  const claudeApiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (isValidClaudeKey(claudeApiKey)) {
    try {
      return await generateClaudeResponse(query, context, claudeApiKey!);
    } catch (e: any) {
      console.warn('⚠️ Claude API call failed, falling back to local engine:', e.message || e);
    }
  }

  return generateLocalResponse(query, context);
}

async function generateGeminiResponse(query: string, context: RetrievedContext, apiKey: string): Promise<{ content: string; citations: any[] }> {
  const systemPrompt = `You are the Discovery Engine AI — an expert analyst of user feedback across app stores, social media, forums, and review platforms. You have access to ${context.documentsCount} analyzed feedback documents.

When answering:
1. Be direct, comprehensive, and helpful. If the user says "hi" or greets you, greet them warmly and explain what insights you can analyze for them.
2. For analytical questions, ground your points in evidence from the retrieved context below.
3. Cite sources inline using [Source: platform, date] format where relevant.
4. Provide structured, clear markdown with bullet points and bold section headers.

## Context - Themes:
${context.themes.map((t: any) => `- **${t.name}** (${t.document_count} docs, avg sentiment: ${(t.avg_sentiment || 0).toFixed(2)}): ${t.description}`).join('\n')}

## Context - Strategic Insights:
${context.insights.map((i: any) => `- [${i.theme_name}] ${i.insight_text} (Confidence: ${(i.confidence * 100).toFixed(0)}%)`).join('\n')}

## Context - Relevant Feedback Quotes:
${context.documents.slice(0, 15).map((d: any) => `- [Source: ${d.source}, ${d.created_at?.split('T')[0]}] "${d.content.slice(0, 200)}"`).join('\n')}

## Context - Top Mentions/Aspects:
${context.aspects.map((a: any) => `- ${a.aspect_name} (${a.sentiment}): ${a.count} mentions`).join('\n')}`;

  // Models to try in order of priority
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: query }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 2048 }
        }),
      });

      if (response.ok) {
        const data = await response.json() as any;
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text returned.';

        const citations: any[] = [];
        const regex = /\[Source:\s*([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const sourceText = match[1];
          const sourcePlat = sourceText.split(',')[0].trim().toLowerCase();
          const matchingDoc = context.documents.find(d => d.source.toLowerCase() === sourcePlat);
          citations.push({ text: sourceText, source: sourcePlat, documentId: matchingDoc?.id });
        }
        return { content, citations };
      } else {
        const errText = await response.text();
        lastError = new Error(`HTTP ${response.status} (${model}): ${errText}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to query Gemini API');
}


async function generateClaudeResponse(query: string, context: RetrievedContext, apiKey: string): Promise<{ content: string; citations: any[] }> {
  const systemPrompt = `You are the Discovery Engine AI — an expert analyst of user feedback across app stores, social media, forums, and review platforms. You have access to ${context.documentsCount} analyzed documents.

When answering:
1. Ground every claim in evidence from retrieved documents.
2. Cite sources inline using [Source: platform, date] format.
3. Quantify where possible.
4. Surface counter-evidence when it exists.
5. Suggest follow-up questions.

## Themes:
${context.themes.map((t: any) => `- **${t.name}** (${t.document_count} docs, sentiment: ${(t.avg_sentiment || 0).toFixed(2)}): ${t.description}`).join('\n')}

## Key Insights:
${context.insights.map((i: any) => `- [${i.theme_name}] ${i.insight_text} (${(i.confidence * 100).toFixed(0)}%)`).join('\n')}

## Relevant Feedback:
${context.documents.slice(0, 15).map((d: any) => `- [Source: ${d.source}, ${d.created_at?.split('T')[0]}] "${d.content.slice(0, 200)}"`).join('\n')}

## Top Aspects:
${context.aspects.map((a: any) => `- ${a.aspect_name} (${a.sentiment}): ${a.count} mentions`).join('\n')}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2048, system: systemPrompt, messages: [{ role: 'user', content: query }] }),
  });
  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
  const data = await response.json() as any;
  const content = data.content?.[0]?.text || 'Unable to generate response.';

  const citations: any[] = [];
  const regex = /\[Source:\s*([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const sourceText = match[1];
    const sourcePlat = sourceText.split(',')[0].trim().toLowerCase();
    const matchingDoc = context.documents.find(d => d.source.toLowerCase() === sourcePlat);
    citations.push({ text: sourceText, source: sourcePlat, documentId: matchingDoc?.id });
  }
  return { content, citations };
}


function generateLocalResponse(query: string, context: RetrievedContext): { content: string; citations: any[] } {
  const q = query.toLowerCase();
  const questionMap = [
    { keywords: ['same categories', 'repeatedly buy', 'repeat', 'reorder', 'habit', 'same items'], idx: 0 },
    { keywords: ['prevent', 'exploring', 'new categories', 'friction', 'barrier', 'blocks'], idx: 1 },
    { keywords: ['discover', 'discovery', 'find products', 'channels'], idx: 2 },
    { keywords: ['habits', 'routine', 'behavior', 'pattern', 'convenience'], idx: 3 },
    { keywords: ['information', 'before trying', 'trust', 'reviews', 'need to know'], idx: 4 },
    { keywords: ['frustration', 'complaints', 'problems', 'issues', 'pain points'], idx: 5 },
    { keywords: ['segments', 'experiment', 'power users', 'explorer'], idx: 6 },
    { keywords: ['unmet needs', 'feature requests', 'missing', 'wishes', 'want'], idx: 7 },
    { keywords: ['price', 'pricing', 'expensive', 'cost', 'value', 'delivery fee'], idx: 8 },
  ];

  let bestMatch = -1, bestScore = 0;
  for (let i = 0; i < questionMap.length; i++) {
    const score = questionMap[i].keywords.filter(kw => q.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestMatch = i; }
  }

  const citations: any[] = [];

  if (bestMatch >= 0 && context.insights[questionMap[bestMatch].idx]) {
    const insight = context.insights[questionMap[bestMatch].idx] as any;
    const relevantDocs = context.documents.filter((d: any) => d.theme_name === insight.theme_name).slice(0, 5);
    if (relevantDocs.length === 0) { relevantDocs.push(...context.documents.slice(0, 3)); }

    let r = `## ${insight.theme_name || 'Analysis'}\n\n`;
    r += `**Key Finding:** ${insight.insight_text}\n\n`;
    r += `This insight has a **${(insight.confidence * 100).toFixed(0)}% confidence score** and is classified as **${insight.actionability} actionability**.\n\n`;
    if (relevantDocs.length > 0) {
      r += `### Supporting Evidence\n\n`;
      for (const doc of relevantDocs.slice(0, 3)) {
        r += `> "${doc.content.slice(0, 150)}..." — [Source: ${doc.source}, ${doc.created_at?.split('T')[0]}]\n\n`;
        citations.push({ text: `${doc.source}, ${doc.created_at?.split('T')[0]}`, source: doc.source });
      }
    }
    if (insight.recommendation) r += `### Recommendation\n\n${insight.recommendation}\n\n`;
    const segments = typeof insight.user_segments === 'string' ? JSON.parse(insight.user_segments) : (insight.user_segments || []);
    if (segments.length) r += `### Affected Segments\n${segments.map((s: string) => `- ${s}`).join('\n')}\n\n`;
    r += `### Follow-up Questions\n- How does this compare across platforms?\n- What interventions have been tried?\n- Which segment is most impacted?\n`;
    return { content: r, citations };
  }

  let r = `## Analysis Summary\n\nBased on **${context.documentsCount} documents** across **${context.themes.length} themes**:\n\n`;
  r += `### Top Themes\n`;
  for (const t of context.themes.slice(0, 5)) r += `- **${t.name}** — ${t.document_count} docs (Sentiment: ${(t.avg_sentiment || 0).toFixed(2)})\n`;
  r += `\n### Key Insights\n`;
  for (const i of context.insights.slice(0, 3) as any[]) r += `- ${i.insight_text.slice(0, 200)}... (${(i.confidence * 100).toFixed(0)}%)\n`;
  if (context.documents.length > 0) {
    r += `\n### Relevant Quotes\n`;
    for (const d of context.documents.slice(0, 3) as any[]) {
      r += `> "${d.content.slice(0, 150)}..." — [Source: ${d.source}]\n\n`;
      citations.push({ text: d.source, source: d.source });
    }
  }
  r += `\n### Suggested Questions\n- Why do users buy from the same categories?\n- What prevents category exploration?\n- What are top frustrations?\n`;
  return { content: r, citations };
}
