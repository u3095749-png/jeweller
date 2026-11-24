import type { IncomingMessage, ServerResponse } from 'http';
import '../server/loadEnv.ts';
import { createApiApp } from '../server/app.ts';

let appPromise: ReturnType<typeof createApiApp> | null = null;

function restoreRewrittenRequestUrl(req: IncomingMessage): void {
  const rawUrl = req.url || '/';
  try {
    const parsed = new URL(rawUrl, 'http://localhost');
    const vercelPath = parsed.searchParams.get('__vercel_path');

    if (vercelPath) {
      parsed.searchParams.delete('__vercel_path');
      const normalizedPath = vercelPath.startsWith('/') ? vercelPath : `/${vercelPath}`;
      if (normalizedPath !== '/api/index') {
        const remainingQuery = parsed.searchParams.toString();
        req.url = remainingQuery ? `${normalizedPath}?${remainingQuery}` : normalizedPath;
        return;
      }
    }

    if (parsed.pathname === '/api/index') {
      const forwardedUri =
        (req.headers['x-vercel-original-url'] as string | undefined) ||
        (req.headers['x-forwarded-uri'] as string | undefined) ||
        (req.headers['x-invoke-path'] as string | undefined) ||
        (req.headers['x-matched-path'] as string | undefined);
      if (
        forwardedUri &&
        (forwardedUri.startsWith('/api/') || forwardedUri.startsWith('/uploads/')) &&
        forwardedUri !== '/api/index' &&
        !forwardedUri.startsWith('/api/index?')
      ) {
        req.url = forwardedUri;
      }
    }
  } catch {
    // Keep original req.url if URL parsing fails
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    restoreRewrittenRequestUrl(req);
    if (!appPromise) {
      appPromise = createApiApp();
    }
    const app = await appPromise;
    return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
  } catch (err: unknown) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Server initialization error.',
      })
    );
  }
}
