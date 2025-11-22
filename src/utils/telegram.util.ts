export interface TelegramInitData {
  user?: {
    id: string;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
  };
  auth_date: number;
  hash: string;
  signature?: string;
  query_id?: string;
  start_param?: string;
}

/**
 * Extracts Telegram init data from request header
 * Handles potential URL encoding issues and whitespace
 */
export function extractInitDataFromHeader(header: string | undefined): string | null {
  if (!header) return null;

  let processed = header.trim();

  // Try decode twice (Telegram sometimes double-encodes)
  try {
    const once = decodeURIComponent(processed);
    const twice = decodeURIComponent(once);

    if (twice.includes('auth_date=')) return twice;
    if (once.includes('auth_date=')) return once;
  } catch {
    // ignore decode errors
  }

  return processed;
}
