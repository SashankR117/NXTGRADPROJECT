import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Send, Sparkles, User, Database, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
  context?: any;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.chat.suggestions().then(d => setSuggestions(d.suggestions));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';

    const userMessage: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await api.chat.send(msg, sessionId);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        citations: response.citations,
        context: response.context,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = '44px';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="chat-container" style={{ height: 'calc(100vh - 128px)' }}>
      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-lg)',
              boxShadow: 'var(--shadow-glow-strong)',
            }}>
              <Sparkles size={28} color="white" />
            </div>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, marginBottom: 'var(--space-sm)', letterSpacing: '-0.02em' }}>
              Ask the Discovery Engine
            </h2>
            <p style={{ color: 'var(--text-tertiary)', maxWidth: 500, lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
              Chat with our AI to explore user feedback patterns, uncover insights, and get strategic recommendations.
              All answers are grounded in real data from {'>'}1,900 analyzed documents across 7 sources.
            </p>

            <div className="suggested-questions" style={{ justifyContent: 'center', maxWidth: 700 }}>
              {suggestions.slice(0, 6).map((q, i) => (
                <button key={i} className="suggested-question" onClick={() => sendMessage(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-md)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: msg.role === 'user' ? 'var(--accent-indigo-glow)' : 'var(--gradient-primary)',
              }}>
                {msg.role === 'user' ? <User size={16} style={{ color: 'var(--accent-indigo-light)' }} /> : <Sparkles size={16} color="white" />}
              </div>
              <div style={{ maxWidth: '85%' }}>
                <div className="chat-bubble">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.context && (
                  <div className="chat-context-bar" style={{ marginTop: 4 }}>
                    <Database size={12} />
                    <span>Searched {msg.context.documentsSearched?.toLocaleString()} documents · Referenced {msg.context.themesReferenced} themes · {msg.context.insightsReferenced} insights</span>
                  </div>
                )}
                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {msg.citations.slice(0, 5).map((c: any, ci: number) => (
                      <span key={ci} className={`source-badge ${c.source || ''}`} style={{ fontSize: '10px' }}>
                        📎 {c.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-primary)',
              }}>
                <Sparkles size={16} color="white" />
              </div>
              <div className="chat-bubble" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--text-tertiary)' }}>Analyzing documents and generating response...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions after conversation */}
      {messages.length > 0 && messages.length < 4 && !loading && (
        <div style={{ padding: '0 var(--space-lg)' }}>
          <div className="suggested-questions">
            {suggestions.slice(6, 10).map((q, i) => (
              <button key={i} className="suggested-question" onClick={() => sendMessage(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about user feedback, themes, insights..."
            rows={1}
          />
          <button className="chat-send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
            <Send size={18} />
          </button>
        </div>
        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
          Powered by AI · Grounded in analyzed user feedback data
        </div>
      </div>
    </div>
  );
}
