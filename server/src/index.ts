import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, queryOne } from './db/index.js';
import { seed } from './db/seed.js';
import { dashboardRouter } from './routes/dashboard.js';
import { chatRouter } from './routes/chat.js';
import { pipelineRouter } from './routes/pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env file (without overwriting existing system/Render environment variables)
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '..', '..', '.env'),
    path.join(__dirname, '..', '.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const k = key ? key.trim() : '';
          const v = valueParts.join('=').trim();
          // Only set if value is non-empty and process.env does not already have a valid value
          if (k && v && (!process.env[k] || process.env[k]?.trim() === '')) {
            process.env[k] = v;
          }
        }
      }
    }
  }
}
loadEnv();

const app = express();
const PORT = process.env.PORT || 3001;


app.use(cors());
app.use(express.json());

// Routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/chat', chatRouter);
app.use('/api/pipeline', pipelineRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static client build in production
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Initialize DB then start server
async function start() {
  await initDb();
  console.log('📦 Database initialized');

  const docCount = queryOne('SELECT COUNT(*) as count FROM documents')?.count || 0;
  if (docCount === 0) {
    console.log('🌱 Database is empty, auto-seeding sample dataset...');
    await seed();
  }

  app.listen(PORT, () => {
    console.log(`🚀 Discovery Engine API running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);


