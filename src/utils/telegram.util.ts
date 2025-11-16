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
  signature?: string; // Newer Telegram WebApp format uses signature instead of hash
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
    if (!initDataRaw || !botToken) {
      console.error('Validation failed: Missing initDataRaw or botToken');
      return null;
    }

    // Parse init data
    const urlParams = new URLSearchParams(initDataRaw);
    
    // Check for 'hash' (old format, hex) or 'signature' (new format, base64url)
    // Telegram can send BOTH, so we need to remove both from dataCheckString
    const hashParam = urlParams.get('hash');
    const signatureParam = urlParams.get('signature');
    
    // Prefer signature if both exist (newer format), otherwise use whichever exists
    const isSignatureFormat = !!signatureParam; // signature = base64url, hash = hex
    const hash = signatureParam || hashParam; // Prefer signature over hash
    const hashParamName = signatureParam ? 'signature' : 'hash';
    
    if (!hash) {
      console.error('Validation failed: Missing hash/signature parameter', {
        availableParams: Array.from(urlParams.keys()),
      });
      return null;
    }

    // Remove BOTH hash and signature from params before building dataCheckString
    // (Telegram can send both, but we exclude both from validation)
    urlParams.delete('hash');
    urlParams.delete('signature');

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

    // Calculate hash - get binary digest first (digest() can only be called once)
    // Then convert to appropriate format based on parameter type
    // signature parameter = base64url format, hash parameter = hex format
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString);
    
    // Get binary digest (can only call digest() once)
    const hashBuffer = hmac.digest();
    
    // Convert to appropriate format based on parameter type
    let calculatedHashToCompare: string;
    if (isSignatureFormat) {
      // For signature parameter: convert to base64url
      const base64 = hashBuffer.toString('base64');
      // Convert to base64url: replace + with -, / with _, and remove padding
      calculatedHashToCompare = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } else {
      // For hash parameter: convert to hex
      calculatedHashToCompare = hashBuffer.toString('hex');
    }

    // Verify hash
    if (calculatedHashToCompare !== hash) {
      console.error('Validation failed: Hash mismatch', {
        received: hash,
        calculated: calculatedHashToCompare,
        format: isSignatureFormat ? 'base64url (signature)' : 'hex (hash)',
        paramName: hashParamName,
        dataCheckString,
        params: Object.fromEntries(urlParams.entries()),
      });
      return null;
    }

    // Check auth_date (should be within 24 hours)
    const authDateStr = urlParams.get('auth_date');
    if (!authDateStr) {
      console.error('Validation failed: Missing auth_date parameter');
      return null;
    }

    const authDate = parseInt(authDateStr, 10);
    if (isNaN(authDate)) {
      console.error('Validation failed: Invalid auth_date format', { authDateStr });
      return null;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDate;

    // Allow 24 hours validity
    if (timeDiff > 86400) {
      console.error('Validation failed: Auth date expired', {
        authDate,
        currentTime,
        timeDiff,
        hoursDiff: (timeDiff / 3600).toFixed(2),
      });
      return null;
    }

    // Parse user data if present
    const userStr = urlParams.get('user');
    let user: TelegramInitData['user'] | undefined;

    if (userStr) {
      try {
        user = JSON.parse(decodeURIComponent(userStr));
      } catch (parseError) {
        console.error('Validation failed: Invalid user JSON', {
          userStr,
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
        });
        return null;
      }
    } else {
      console.error('Validation failed: Missing user parameter');
      return null;
    }

    return {
      user,
      auth_date: authDate,
      hash,
      signature: hashParamName === 'signature' ? hash : undefined,
      query_id: urlParams.get('query_id') || undefined,
      start_param: urlParams.get('start_param') || undefined,
    };
  } catch (error) {
    console.error('Error validating Telegram init data:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      initDataRaw: initDataRaw?.substring(0, 100), // Log first 100 chars for debugging
    });
    return null;
  }
}

/**
 * Extracts Telegram init data from request header
 * Handles potential URL encoding issues and whitespace
 */
export function extractInitDataFromHeader(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  // Trim whitespace (headers can have leading/trailing spaces)
  let processedHeader = header.trim();

  // Try to decode if it appears to be URL-encoded
  // Check if header contains % signs (indicating URL encoding)
  if (processedHeader.includes('%')) {
    try {
      const decoded = decodeURIComponent(processedHeader);
      // If decoding succeeds and produces valid init data format, use it
      // Check for both hash (old format) and signature (new format)
      if (decoded.includes('auth_date=') && (decoded.includes('hash=') || decoded.includes('signature='))) {
        return decoded;
      }
    } catch {
      // If decoding fails, continue with original header
    }
  }

  return processedHeader;
}

