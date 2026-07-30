import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'discovery.db');

let db: any;

export async function initDb(): Promise<any> {
  const SQL = await initSqlJs();

  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Load or create database
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create all tables
  db.run(`
    CREATE TABLE IF NOT EXISTS themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      topic_count INTEGER DEFAULT 0,
      document_count INTEGER DEFAULT 0,
      avg_sentiment REAL DEFAULT 0,
      last_updated TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      keywords TEXT NOT NULL,
      document_count INTEGER DEFAULT 0,
      theme_id INTEGER REFERENCES themes(id),
      trend_data TEXT,
      last_updated TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_id TEXT,
      content TEXT NOT NULL,
      title TEXT,
      rating INTEGER,
      author TEXT,
      author_meta TEXT,
      language TEXT DEFAULT 'en',
      category TEXT,
      product TEXT,
      platform TEXT,
      sentiment_valence REAL,
      sentiment_label TEXT,
      sentiment_confidence REAL,
      topic_id INTEGER REFERENCES topics(id),
      theme_id INTEGER REFERENCES themes(id),
      created_at TEXT NOT NULL,
      ingested_at TEXT DEFAULT (datetime('now')),
      fingerprint TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS aspects (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id),
      aspect_name TEXT NOT NULL,
      sentiment TEXT NOT NULL,
      snippet TEXT,
      confidence REAL DEFAULT 0.8
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id),
      entity_text TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      start_idx INTEGER,
      end_idx INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      theme_id INTEGER REFERENCES themes(id),
      insight_text TEXT NOT NULL,
      recommendation TEXT,
      confidence REAL DEFAULT 0.8,
      actionability TEXT DEFAULT 'medium',
      user_segments TEXT,
      strategic_question TEXT,
      validation_status TEXT DEFAULT 'validated',
      source_types TEXT,
      evidence_count INTEGER DEFAULT 0,
      generated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      insight_id TEXT NOT NULL REFERENCES insights(id),
      document_id TEXT NOT NULL REFERENCES documents(id),
      quote TEXT NOT NULL,
      source TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      citations TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      documents_fetched INTEGER DEFAULT 0,
      documents_processed INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      log TEXT
    )
  `);

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source)',
    'CREATE INDEX IF NOT EXISTS idx_documents_sentiment ON documents(sentiment_label)',
    'CREATE INDEX IF NOT EXISTS idx_documents_theme ON documents(theme_id)',
    'CREATE INDEX IF NOT EXISTS idx_documents_topic ON documents(topic_id)',
    'CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category)',
    'CREATE INDEX IF NOT EXISTS idx_aspects_document ON aspects(document_id)',
    'CREATE INDEX IF NOT EXISTS idx_aspects_name ON aspects(aspect_name)',
    'CREATE INDEX IF NOT EXISTS idx_entities_document ON entities(document_id)',
    'CREATE INDEX IF NOT EXISTS idx_evidence_insight ON evidence(insight_id)',
    'CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_pipeline_source ON pipeline_runs(source)',
  ];
  for (const idx of indexes) {
    db.run(idx);
  }

  saveDb();
  return db;
}

export function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function getDb(): any {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

// Helper to run a query and get all results as objects
export function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper to get a single result
export function queryOne(sql: string, params: any[] = []): any {
  const results = queryAll(sql, params);
  return results[0] || null;
}

// Helper to run a statement (insert/update/delete)
export function execute(sql: string, params: any[] = []) {
  db.run(sql, params);
}
