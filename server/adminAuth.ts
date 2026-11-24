import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  getStoredAdminCredential,
  setStoredAdminCredential,
  updateActivityLogWhatsAppStatus,
} from './store.ts';

const COOKIE_NAME = 'zaveri_admin_sid';
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

// Random boot fallback used only when no persistent server secret env var is set
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

interface AdminSessionRecord {
  sessionId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

const activeSessions = new Map<string, AdminSessionRecord>();
const revokedSessionIds = new Set<string>();

function getSessionSigningSecret(): string {
  const explicit = (process.env.SESSION_SECRET || '').trim();
  if (explicit) return explicit;
  const seed = [
    process.env.ADMIN_EMAIL || '',
    process.env.ADMIN_PASSWORD || '',
    process.env.GEMINI_API_KEY || '',
  ]
    .filter(Boolean)
    .join('|');
  if (seed) {
    return crypto.createHmac('sha256', 'zaveri-atelier-session-secret-v1').update(seed).digest('hex');
  }
  const stored = getStoredAdminCredential();
  if (stored?.passwordHash) {
    return crypto
      .createHmac('sha256', 'zaveri-atelier-session-secret-v1')
      .update(`${stored.email}:${stored.passwordHash}`)
      .digest('hex');
  }
  return EPHEMERAL_FALLBACK_SECRET;
}

// Sliding-window rate limiter for login attempts: max 5 failures per 15 min
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const failedLoginBuckets = new Map<string, number[]>();

// In-memory salted hash for env-configured ADMIN_PASSWORD (never store/compare raw strings casually)
let cachedEnvHash: { email: string; salt: string; hash: string; sourcePassword: string } | null =
  null;

export function hashPasswordWithSalt(password: string, salt?: string): {
  salt: string;
  hash: string;
} {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash };
}

export function verifyPasswordHash(password: string, salt: string, expectedHashHex: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function normalizeEnvSecret(raw: string | undefined): string {
  let value = (raw || '').trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function isPlaceholderSecret(value: string): boolean {
  return /^(my_admin_|your_admin_|replace_with_|changeme)/i.test(value);
}

function getEnvAdminCredentials(): {
  email: string;
  salt: string;
  hash: string;
} | null {
  const envEmail = normalizeEnvSecret(process.env.ADMIN_EMAIL).toLowerCase();
  const envPassword = normalizeEnvSecret(process.env.ADMIN_PASSWORD);
  if (!envEmail || !envPassword) return null;
  if (isPlaceholderSecret(envEmail) || isPlaceholderSecret(envPassword)) return null;

  if (
    !cachedEnvHash ||
    cachedEnvHash.email !== envEmail ||
    cachedEnvHash.sourcePassword !== envPassword
  ) {
    const { salt, hash } = hashPasswordWithSalt(envPassword);
    cachedEnvHash = { email: envEmail, salt, hash, sourcePassword: envPassword };
  }
  return { email: cachedEnvHash.email, salt: cachedEnvHash.salt, hash: cachedEnvHash.hash };
}

export function getAdminAuthConfigStatus(): {
  source: 'env' | 'store' | 'unconfigured';
  configError?: string;
} {
  const rawEmail = normalizeEnvSecret(process.env.ADMIN_EMAIL);
  const rawPassword = normalizeEnvSecret(process.env.ADMIN_PASSWORD);
  const hasRealEmail = Boolean(rawEmail && !isPlaceholderSecret(rawEmail));
  const hasRealPassword = Boolean(rawPassword && !isPlaceholderSecret(rawPassword));

  if (hasRealEmail || hasRealPassword) {
    if (hasRealEmail && !hasRealPassword) {
      return {
        source: 'unconfigured',
        configError:
          'ADMIN_EMAIL is configured in server secrets without ADMIN_PASSWORD. Set both or remove both to use on-screen setup.',
      };
    }
    if (!hasRealEmail && hasRealPassword) {
      return {
        source: 'unconfigured',
        configError:
          'ADMIN_PASSWORD is configured in server secrets without ADMIN_EMAIL. Set both or remove both to use on-screen setup.',
      };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return {
        source: 'env',
        configError: 'Server secret ADMIN_EMAIL is not formatted as a valid email address.',
      };
    }
    return { source: 'env' };
  }

  if (getStoredAdminCredential()) {
    return { source: 'store' };
  }
  return { source: 'unconfigured' };
}

export function isAdminSetupRequired(): boolean {
  if (getEnvAdminCredentials()) return false;
  return !getStoredAdminCredential();
}

export function claimInitialAdminAccount(emailRaw: string, passwordRaw: string): {
  ok: boolean;
  email?: string;
  error?: string;
} {
  if (!isAdminSetupRequired()) {
    return {
      ok: false,
      error: 'Administrator credentials are already configured. Please sign in.',
    };
  }
  const email = emailRaw.trim().toLowerCase();
  const password = passwordRaw.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid administrator email address.' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Administrator password must be at least 8 characters.' };
  }

  const { salt, hash } = hashPasswordWithSalt(password);
  setStoredAdminCredential({
    email,
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString(),
  });
  return { ok: true, email };
}

export function verifyAdminCredentials(emailRaw: string, passwordRaw: string): {
  ok: boolean;
  normalizedEmail: string;
  reason?: 'email_mismatch' | 'password_mismatch' | 'missing_credentials' | 'unconfigured';
} {
  const normalizedEmail = emailRaw.trim().toLowerCase();
  const trimmedPassword = passwordRaw.trim();
  if (!normalizedEmail || !trimmedPassword) {
    return { ok: false, normalizedEmail, reason: 'missing_credentials' };
  }

  const envCreds = getEnvAdminCredentials();
  const activeCreds = envCreds || (() => {
    const stored = getStoredAdminCredential();
    if (!stored) return null;
    return { email: stored.email.toLowerCase(), salt: stored.salt, hash: stored.passwordHash };
  })();

  if (!activeCreds) {
    return { ok: false, normalizedEmail, reason: 'unconfigured' };
  }

  // Constant-length HMAC comparison for email so timing does not leak email validity before password check
  const signingKey = getSessionSigningSecret();
  const emailMatch = crypto.timingSafeEqual(
    crypto.createHmac('sha256', signingKey).update(normalizedEmail).digest(),
    crypto.createHmac('sha256', signingKey).update(activeCreds.email).digest()
  );
  const passwordMatch =
    verifyPasswordHash(passwordRaw, activeCreds.salt, activeCreds.hash) ||
    (trimmedPassword !== passwordRaw &&
      verifyPasswordHash(trimmedPassword, activeCreds.salt, activeCreds.hash));

  if (emailMatch && passwordMatch) {
    return { ok: true, normalizedEmail };
  }
  return {
    ok: false,
    normalizedEmail,
    reason: !emailMatch ? 'email_mismatch' : 'password_mismatch',
  };
}

export function getAdminProfileSummary(session: {
  email: string;
  createdAt: number;
  expiresAt: number;
}): {
  email: string;
  source: 'env' | 'store' | 'unconfigured';
  sessionCreatedAt: string;
  sessionExpiresAt: string;
  canChangePassword: boolean;
  whatsappConfigured: boolean;
} {
  const status = getAdminAuthConfigStatus();
  return {
    email: session.email,
    source: status.source,
    sessionCreatedAt: new Date(session.createdAt).toISOString(),
    sessionExpiresAt: new Date(session.expiresAt).toISOString(),
    canChangePassword: status.source === 'store',
    whatsappConfigured: isWhatsAppCloudConfigured(),
  };
}

export function changeStoredAdminPassword(
  email: string,
  currentPassword: string,
  newPassword: string
): { ok: boolean; error?: string } {
  const status = getAdminAuthConfigStatus();
  if (status.source === 'env') {
    return {
      ok: false,
      error:
        'Administrator credentials are managed via server environment secrets (ADMIN_EMAIL / ADMIN_PASSWORD). Update ADMIN_PASSWORD in Settings > Secrets.',
    };
  }
  const stored = getStoredAdminCredential();
  if (!stored || stored.email.toLowerCase() !== email.trim().toLowerCase()) {
    return { ok: false, error: 'Stored administrator credential record not found.' };
  }
  if (!verifyPasswordHash(currentPassword, stored.salt, stored.passwordHash)) {
    return { ok: false, error: 'Current password is incorrect.' };
  }
  const trimmedNew = newPassword.trim();
  if (trimmedNew.length < 8) {
    return { ok: false, error: 'New password must be at least 8 characters long.' };
  }
  const { salt, hash } = hashPasswordWithSalt(trimmedNew);
  setStoredAdminCredential({
    ...stored,
    passwordHash: hash,
    salt,
  });
  return { ok: true };
}

function getClientKey(req: Request, email: string): string {
  const ip =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.ip) || 'unknown';
  return `${ip}::${email.toLowerCase()}`;
}

export function checkLoginRateLimit(req: Request, email: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const key = getClientKey(req, email);
  const now = Date.now();
  const recent = (failedLoginBuckets.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (recent.length > 0) {
    failedLoginBuckets.set(key, recent);
  } else {
    failedLoginBuckets.delete(key);
  }
  if (recent.length >= MAX_FAILED_ATTEMPTS) {
    const oldest = recent[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true };
}

export function recordFailedLoginAttempt(req: Request, email: string): void {
  const key = getClientKey(req, email);
  const now = Date.now();
  const recent = (failedLoginBuckets.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  recent.push(now);
  failedLoginBuckets.set(key, recent);
  if (failedLoginBuckets.size > 1000) {
    const firstKey = failedLoginBuckets.keys().next().value;
    if (firstKey) failedLoginBuckets.delete(firstKey);
  }
}

export function clearFailedLoginAttempts(req: Request, email: string): void {
  failedLoginBuckets.delete(getClientKey(req, email));
}

function signSessionRecord(record: AdminSessionRecord): string {
  const payloadB64 = Buffer.from(JSON.stringify(record), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSigningSecret())
    .update(payloadB64)
    .digest('hex');
  return `${payloadB64}.${sig}`;
}

function verifySignedSessionToken(cookieValue: string): AdminSessionRecord | null {
  const dotIdx = cookieValue.lastIndexOf('.');
  if (dotIdx <= 0) return null;
  const payloadB64 = cookieValue.slice(0, dotIdx);
  const providedSig = cookieValue.slice(dotIdx + 1);
  const expectedSig = crypto
    .createHmac('sha256', getSessionSigningSecret())
    .update(payloadB64)
    .digest('hex');
  try {
    const a = Buffer.from(providedSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Partial<AdminSessionRecord>;
    if (
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.createdAt !== 'number' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    if (revokedSessionIds.has(parsed.sessionId) || Date.now() > parsed.expiresAt) {
      return null;
    }
    return {
      sessionId: parsed.sessionId,
      email: parsed.email,
      createdAt: parsed.createdAt,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = decodeURIComponent(part.slice(eqIdx + 1).trim());
    result[key] = val;
  }
  return result;
}

function isHttpsRequest(req: Request): boolean {
  const xfProto = req.get('x-forwarded-proto');
  const origin = req.get('origin') || '';
  const referer = req.get('referer') || '';
  return Boolean(
    req.secure ||
      (xfProto && xfProto.toLowerCase().includes('https')) ||
      origin.toLowerCase().startsWith('https://') ||
      referer.toLowerCase().startsWith('https://')
  );
}

export function createAdminSession(email: string, req: Request, res: Response): AdminSessionRecord {
  const sessionId = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  const record: AdminSessionRecord = {
    sessionId,
    email,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  activeSessions.set(sessionId, record);

  const token = signSessionRecord(record);
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  const cookieAttrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAgeSec}`,
    isHttpsRequest(req) ? 'SameSite=None; Secure; Partitioned' : 'SameSite=Lax',
  ].join('; ');

  res.setHeader('Set-Cookie', cookieAttrs);
  return record;
}

export function getAuthenticatedAdminSession(req: Request): AdminSessionRecord | null {
  const cookies = parseCookies(req);
  const rawToken = cookies[COOKIE_NAME];
  if (!rawToken) return null;
  const verified = verifySignedSessionToken(rawToken);
  if (!verified) return null;
  if (!activeSessions.has(verified.sessionId)) {
    activeSessions.set(verified.sessionId, verified);
  }
  return verified;
}

export function destroyAdminSession(req: Request, res: Response): string | null {
  const existing = getAuthenticatedAdminSession(req);
  if (existing) {
    activeSessions.delete(existing.sessionId);
    revokedSessionIds.add(existing.sessionId);
    if (revokedSessionIds.size > 1000) {
      const oldest = revokedSessionIds.values().next().value;
      if (oldest) revokedSessionIds.delete(oldest);
    }
  }
  const clearAttrs = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    isHttpsRequest(req) ? 'SameSite=None; Secure; Partitioned' : 'SameSite=Lax',
  ].join('; ');
  res.setHeader('Set-Cookie', clearAttrs);
  return existing?.email || null;
}

export function setNoStoreHeaders(res: Response): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Cookie');
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  setNoStoreHeaders(res);
  const session = getAuthenticatedAdminSession(req);
  if (!session) {
    res.status(401).json({ error: 'Authentication required. Please log in as administrator.' });
    return;
  }
  (req as Request & { adminSession?: AdminSessionRecord }).adminSession = session;
  next();
}

export function requireCsrfCheck(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }

  // Allow custom XMLHttpRequest header OR same-host Origin/Referer verification
  if (req.get('x-requested-with') === 'XMLHttpRequest') {
    next();
    return;
  }

  const host = (req.get('x-forwarded-host') || req.get('host') || '').toLowerCase();
  const origin = req.get('origin');
  const referer = req.get('referer');

  try {
    if (origin && host && new URL(origin).host.toLowerCase() === host) {
      next();
      return;
    }
    if (referer && host && new URL(referer).host.toLowerCase() === host) {
      next();
      return;
    }
  } catch {
    // Malformed origin/referer falls through to 403
  }

  // Permit local CLI testing when no browser Origin header is sent over localhost
  if (!origin && !referer && (host.startsWith('localhost:') || host.startsWith('127.0.0.1:'))) {
    next();
    return;
  }

  res.status(403).json({ error: 'Request origin validation failed.' });
}

export function isWhatsAppCloudConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_CLOUD_API_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.ADMIN_WHATSAPP_TO
  );
}

export async function dispatchWhatsAppLoginAlert(params: {
  activityLogId: string;
  email: string;
  status: 'Successful' | 'Failed Login Attempt';
  timestampIso: string;
}): Promise<void> {
  const token = (process.env.WHATSAPP_CLOUD_API_TOKEN || '').trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const to = (process.env.ADMIN_WHATSAPP_TO || '').replace(/[^\d]/g, '');

  if (!token || !phoneNumberId || !to) {
    updateActivityLogWhatsAppStatus(
      params.activityLogId,
      'Skipped (WhatsApp Cloud API credentials not configured)'
    );
    return;
  }

  const formattedTime = new Date(params.timestampIso).toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Karachi',
  });

  // Security rule: NEVER include passwords or secret tokens in notification messages.
  const textBody =
    params.status === 'Successful'
      ? `Admin login successful. Email: ${params.email || '(empty)'}. Time: ${formattedTime} PKT.`
      : `Failed admin login attempt. Email entered: ${params.email || '(empty)'}. Time: ${formattedTime} PKT.`;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            preview_url: false,
            body: textBody,
          },
        }),
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      updateActivityLogWhatsAppStatus(
        params.activityLogId,
        `Delivery failed (HTTP ${response.status})${errText ? '' : ''}`
      );
      return;
    }

    updateActivityLogWhatsAppStatus(params.activityLogId, 'WhatsApp Alert Sent');
  } catch {
    updateActivityLogWhatsAppStatus(
      params.activityLogId,
      'Delivery failed (network timeout or Graph API error)'
    );
  }
}
