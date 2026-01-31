const AUTH_COOKIE_NAME = 'autograder_auth';

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not set');
  }
  return secret;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createAuthToken(options?: { ttlSeconds?: number }): Promise<{ token: string; expiresAt: number }> {
  const ttlSeconds = options?.ttlSeconds ?? 60 * 60 * 24;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = nowSeconds + ttlSeconds;
  const secret = getAuthSecret();
  const sig = await hmacSha256Hex(secret, String(exp));
  return { token: `${exp}.${sig}`, expiresAt: exp };
}

export async function verifyAuthToken(token: string | undefined | null): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!token) return { ok: false, reason: 'missing' };

  const [expRaw, sig] = token.split('.');
  if (!expRaw || !sig) return { ok: false, reason: 'malformed' };

  const exp = Number(expRaw);
  if (!Number.isFinite(exp)) return { ok: false, reason: 'malformed' };

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (exp <= nowSeconds) return { ok: false, reason: 'expired' };

  const secret = getAuthSecret();
  const expectedSig = await hmacSha256Hex(secret, expRaw);

  if (expectedSig !== sig) return { ok: false, reason: 'bad-signature' };
  return { ok: true };
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME;
}
