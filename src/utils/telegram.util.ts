import * as crypto from 'crypto';

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
  query_id?: string;
  start_param?: string;
}

/**
 * Validates Telegram WebApp init data
 * @param initDataRaw - Raw init data string from Telegram
 * @param botToken - Telegram bot token (should be in env)
 * @returns Parsed init data if valid, null otherwise
 */
export function validateTelegramInitData(
  initDataRaw: string,
  botToken: string,
): TelegramInitData | null {
  try {
    // Parse init data
    const urlParams = new URLSearchParams(initDataRaw);
    const hash = urlParams.get('hash');
    if (!hash) {
      return null;
    }

    // Remove hash from params for validation
    urlParams.delete('hash');

    // Sort parameters alphabetically
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Verify hash
    if (calculatedHash !== hash) {
      return null;
    }

    // Check auth_date (should be within 24 hours)
    const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDate;

    // Allow 24 hours validity
    if (timeDiff > 86400) {
      return null;
    }

    // Parse user data if present
    const userStr = urlParams.get('user');
    let user: TelegramInitData['user'] | undefined;

    if (userStr) {
      try {
        user = JSON.parse(decodeURIComponent(userStr));
      } catch {
        // Invalid user JSON
        return null;
      }
    }

    return {
      user,
      auth_date: authDate,
      hash,
      query_id: urlParams.get('query_id') || undefined,
      start_param: urlParams.get('start_param') || undefined,
    };
  } catch (error) {
    console.error('Error validating Telegram init data:', error);
    return null;
  }
}

/**
 * Extracts Telegram init data from request header
 */
export function extractInitDataFromHeader(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  return header;
}

