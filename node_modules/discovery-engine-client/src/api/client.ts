const API_BASE = '/api';

async function fetchJSON(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  dashboard: {
    overview: () => fetchJSON('/dashboard/overview'),
    themes: () => fetchJSON('/dashboard/themes'),
    themeDetail: (id: number) => fetchJSON(`/dashboard/themes/${id}`),
    insights: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchJSON(`/dashboard/insights${qs}`);
    },
    sources: () => fetchJSON('/dashboard/sources'),
    explorer: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchJSON(`/dashboard/explorer${qs}`);
    },
    trends: () => fetchJSON('/dashboard/trends'),
    segments: () => fetchJSON('/dashboard/segments'),
    aspects: () => fetchJSON('/dashboard/aspects'),
  },
  chat: {
    send: (message: string, sessionId?: string) =>
      fetchJSON('/chat', {
        method: 'POST',
        body: JSON.stringify({ message, sessionId }),
      }),
    suggestions: () => fetchJSON('/chat/suggestions'),
    history: (sessionId: string) => fetchJSON(`/chat/history?sessionId=${sessionId}`),
  },
  pipeline: {
    status: () => fetchJSON('/pipeline/status'),
    trigger: () => fetchJSON('/pipeline/trigger', { method: 'POST' }),
    triggerYouTube: (videoUrl?: string) => fetchJSON('/pipeline/trigger-youtube', { method: 'POST', body: JSON.stringify({ videoUrl }) }),
  },
};

