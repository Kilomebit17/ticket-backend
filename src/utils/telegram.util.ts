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
 * 
 * Note: Telegram init data validation requires the exact string format.
 * We need to decode URL-encoded data but preserve the exact query string format.
 */
export function extractInitDataFromHeader(header: string | undefined): string | null {
  if (!header) return null;

  const trimmed = header.trim();
  if (!trimmed) return null;

  // If the header is already a query string format (contains 'auth_date='), use it as-is
  // This is the most common case - raw query string in the header
  if (trimmed.includes('auth_date=') && !trimmed.includes('%')) {
    return trimmed;
  }

  // If the header is URL-encoded, decode it once
  // Telegram typically sends init data as a URL-encoded query string
  try {
    const decoded = decodeURIComponent(trimmed);
    
    // Verify it looks like valid init data
    if (decoded.includes('auth_date=')) {
      return decoded;
    }
    
    // Try decoding once more in case of double-encoding (rare but possible)
    const doubleDecoded = decodeURIComponent(decoded);
    if (doubleDecoded.includes('auth_date=')) {
      return doubleDecoded;
    }
  } catch {
    // If decoding fails, return trimmed original
    // The library might handle it or throw a clearer error
  }

  // Return trimmed original if no decoding was needed or successful
  return trimmed;
}
