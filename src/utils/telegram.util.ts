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
  signature?: string;
  query_id?: string;
  start_param?: string;
}

export function validateTelegramInitData(
  initDataRaw: string,
  botToken: string,
): TelegramInitData | null {
  try {
    if (!initDataRaw || !botToken) {
      console.error('Validation failed: Missing initDataRaw or botToken');
      return null;
    }

    const urlParams = new URLSearchParams(initDataRaw);

    const hashParam = urlParams.get('hash');
    const signatureParam = urlParams.get('signature');

    if (!hashParam && !signatureParam) {
      console.error('Validation failed: Missing hash or signature');
      return null;
    }

    // New format if signature exists
    const useSignature = !!signatureParam;
    const hashToVerify = useSignature ? signatureParam! : hashParam!;

    // Remove both hash and signature before building data check string
    const paramsForValidation = new URLSearchParams();
    for (const [key, value] of urlParams.entries()) {
      if (key !== 'hash' && key !== 'signature') {
        paramsForValidation.append(key, value);
      }
    }

    const dataCheckString = Array.from(paramsForValidation.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // --- SECRET KEY FIX ---
    let secretKey: Buffer;

    if (useSignature) {
      // NEW format → SHA256(botToken)
      secretKey = crypto.createHash('sha256').update(botToken).digest();
    } else {
      // OLD format → HMAC_SHA256("WebAppData", botToken)
      secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    }

    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest();

    let calculated: string;
    if (useSignature) {
      // Convert to base64url
      calculated = hmac
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } else {
      calculated = hmac.toString('hex');
    }

    if (calculated !== hashToVerify) {
      console.error('Validation failed: Hash mismatch', {
        received: hashToVerify,
        calculated,
        useSignature,
        dataCheckString,
      });
      return null;
    }

    // Validate auth date
    const authDateStr = urlParams.get('auth_date');
    if (!authDateStr) return null;

    const authDate = parseInt(authDateStr, 10);
    if (isNaN(authDate)) return null;

    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      console.error('Validation failed: Auth date expired');
      return null;
    }

    // Parse user
    const userStr = urlParams.get('user');
    if (!userStr) {
      console.error('Validation failed: Missing user');
      return null;
    }

    let user;
    try {
      user = JSON.parse(decodeURIComponent(userStr));
    } catch (e) {
      console.error('Validation failed: Invalid user JSON', userStr);
      return null;
    }

    return {
      user,
      auth_date: authDate,
      hash: hashParam || '',
      signature: signatureParam || undefined,
      query_id: urlParams.get('query_id') || undefined,
      start_param: urlParams.get('start_param') || undefined,
    };
  } catch (err) {
    console.error('Error validating Telegram init data:', err);
    return null;
  }
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
