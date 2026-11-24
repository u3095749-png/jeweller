/**
 * Safely parses a Fetch API Response as JSON without throwing opaque SyntaxError
 * messages when a host returns HTML or plain text (e.g. HTTP 404/502/504 pages).
 */
export async function safeReadJson<T = Record<string, unknown>>(
  res: Response,
  contextLabel = 'API request'
): Promise<T> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const rawText = await res.text();
  const trimmed = rawText.trim();

  if (!trimmed) {
    if (!res.ok) {
      throw new Error(`${contextLabel} failed with HTTP ${res.status}. Please try again.`);
    }
    return {} as T;
  }

  const looksLikeHtml =
    contentType.includes('text/html') || /^<!doctype\s+html|^<html[\s>]/i.test(trimmed);

  if (
    !looksLikeHtml &&
    (contentType.includes('application/json') ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('['))
  ) {
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      throw new Error(
        `${contextLabel} returned an unreadable response (HTTP ${res.status}). Please try again.`
      );
    }
  }

  if (res.status === 400) {
    throw new Error(
      `${contextLabel} request could not be processed (HTTP 400). Please check your input or API key configuration.`
    );
  }
  if (res.status === 404 || /page could not be found/i.test(trimmed)) {
    throw new Error(
      `The AI service endpoint could not be reached (HTTP 404). Please verify the backend API route and GEMINI_API_KEY configuration.`
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Server authorization failed (HTTP ${res.status}). Please check GEMINI_API_KEY in .env.local or Settings > Secrets.`
    );
  }
  if (res.status === 429) {
    throw new Error('The AI service is receiving high traffic right now (HTTP 429). Please wait a moment and retry.');
  }
  if (looksLikeHtml || res.status >= 500) {
    throw new Error(
      `The server returned an unexpected error page (HTTP ${res.status}). Please verify server configuration and try again.`
    );
  }

  throw new Error(`${contextLabel} received an unexpected non-JSON response (HTTP ${res.status}).`);
}
