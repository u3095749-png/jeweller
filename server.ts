import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STORE_CONFIG } from './src/config/storeConfig.ts';
import { getAdminAuthConfigStatus } from './server/adminAuth.ts';
import { createApiApp } from './server/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = await createApiApp();

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const authStatus = getAdminAuthConfigStatus();
    console.log(
      `${STORE_CONFIG.brandName} server listening on http://0.0.0.0:${PORT} [AdminAuth source=${authStatus.source}${
        authStatus.configError ? `, configError=${authStatus.configError}` : ''
      }]`
    );
  });
}

const isDirectCliEntry =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === __filename;

if (!process.env.VERCEL && isDirectCliEntry) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
