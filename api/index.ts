import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from '../server/app.ts';

let appPromise: ReturnType<typeof createApiApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.url && (req.url === '/api/index' || req.url.startsWith('/api/index?'))) {
      const forwardedUri =
        (req.headers['x-vercel-original-url'] as string | undefined) ||
        (req.headers['x-forwarded-uri'] as string | undefined) ||
        (req.headers['x-matched-path'] as string | undefined);
      if (
        forwardedUri &&
        (forwardedUri.startsWith('/api/') || forwardedUri.startsWith('/uploads/')) &&
        forwardedUri !== '/api/index'
      ) {
        req.url = forwardedUri;
      }
    }
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
