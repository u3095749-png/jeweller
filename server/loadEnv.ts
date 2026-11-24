import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLACEHOLDER_VALUE_RE = /^(my_gemini_|mypi_key|your_gemini_|my_app_url|my_admin_|your_admin_|replace_with_|changeme)/i;

function isUnsetOrPlaceholder(raw: string | undefined): boolean {
  if (!raw) return true;
  let val = raw.trim();
  if (
    val.length >= 2 &&
    ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
  ) {
    val = val.slice(1, -1).trim();
  }
  return !val || PLACEHOLDER_VALUE_RE.test(val);
}

let envLoaded = false;

/**
 * Loads environment variables in Next.js/Vite precedence order without overwriting
 * real secrets already injected by the runtime (AI Studio Secrets, Vercel, or shell):
 *   1. Real non-placeholder process.env values (highest priority)
 *   2. .env.local
 *   3. .env.<NODE_ENV>.local
 *   4. .env
 */
export function loadServerEnv(): void {
  if (envLoaded) return;
  envLoaded = true;

  const projectRoot = path.resolve(__dirname, '..');
  const candidateDirs = Array.from(new Set([process.cwd(), projectRoot]));
  const mode = (process.env.NODE_ENV || 'development').trim();

  const fileOrder = [
    `.env.${mode}.local`,
    '.env.local',
    `.env.${mode}`,
    '.env',
  ];

  // Track keys already set cleanly in the OS/runtime before reading files
  const preExistingRealKeys = new Set<string>();
  for (const [k, v] of Object.entries(process.env)) {
    if (!isUnsetOrPlaceholder(v)) {
      preExistingRealKeys.add(k);
    }
  }

  for (const dir of candidateDirs) {
    for (const fileName of fileOrder) {
      const fullPath = path.join(dir, fileName);
      if (!fs.existsSync(fullPath)) continue;
      try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        const parsed = dotenv.parse(raw);
        for (const [key, value] of Object.entries(parsed)) {
          if (preExistingRealKeys.has(key)) continue;
          if (isUnsetOrPlaceholder(process.env[key]) && !isUnsetOrPlaceholder(value)) {
            process.env[key] = value.trim();
          } else if (process.env[key] === undefined) {
            process.env[key] = value;
          }
        }
      } catch {
        // Ignore unreadable env file and continue checking remaining sources
      }
    }
  }
}

loadServerEnv();
