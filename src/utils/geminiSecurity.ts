import type { IncomingMessage } from 'http';

const ALLOWED_ORIGINS = [
  'https://ais-dev-vmo4nus7oc3syjyfbrofla-938723057487.asia-southeast1.run.app',
  'https://ais-pre-vmo4nus7oc3syjyfbrofla-938723057487.asia-southeast1.run.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

// In-memory sliding window for IP rate limiting
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipLimits = new Map<string, RateLimitEntry>();

/**
 * Get client IP address from standard proxy headers
 */
export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const clientIp = ips.split(',')[0].trim();
    if (clientIp) return clientIp;
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp.trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Validate that Authorization header contains a valid JWT-shaped Bearer token
 */
export function validateAuthHeader(req: IncomingMessage): { ok: boolean; error?: string } {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    return { ok: false, error: 'Unauthorized: Missing Authorization header with Bearer token' };
  }

  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return { ok: false, error: 'Unauthorized: Authorization header must use Bearer scheme' };
  }

  const token = trimmed.substring(7).trim();
  if (!token) {
    return { ok: false, error: 'Unauthorized: Bearer token cannot be empty' };
  }

  // Verify JWT structure: 3 dot-separated base64-encoded segments
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((p) => p.length < 2)) {
    return { ok: false, error: 'Unauthorized: Invalid Firebase ID token format (must be valid JWT)' };
  }

  return { ok: true };
}

/**
 * Check sliding window rate limit per IP (default: max 30 requests per minute)
 */
export function checkRateLimit(
  ip: string,
  maxRequests = 30,
  windowMs = 60000
): { ok: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = ipLimits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { ok: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { ok: true };
}

/**
 * Clean up expired rate limits periodically
 */
export function cleanupExpiredRateLimits(now = Date.now()): void {
  for (const [ip, entry] of ipLimits.entries()) {
    if (now > entry.resetAt) {
      ipLimits.delete(ip);
    }
  }
}

/**
 * Determine valid CORS headers matching deployment origin
 */
export function getCorsHeaders(req: IncomingMessage): Record<string, string> {
  const origin = req.headers['origin'];
  let matchedOrigin = ALLOWED_ORIGINS[0];

  if (origin && typeof origin === 'string') {
    const trimmed = origin.trim();
    if (
      ALLOWED_ORIGINS.includes(trimmed) ||
      trimmed.endsWith('.run.app') ||
      trimmed.endsWith('.vercel.app')
    ) {
      matchedOrigin = trimmed;
    }
  }

  return {
    'Access-Control-Allow-Origin': matchedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}
