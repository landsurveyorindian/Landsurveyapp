import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAuthHeader, checkRateLimit, getCorsHeaders, getClientIp } from './geminiSecurity.ts';
import type { IncomingMessage } from 'http';

test('Gemini Security: validateAuthHeader rejects missing or malformed tokens', () => {
  const reqNoHeader = { headers: {} } as IncomingMessage;
  assert.equal(validateAuthHeader(reqNoHeader).ok, false);

  const reqBasic = { headers: { authorization: 'Basic abc123xyz' } } as IncomingMessage;
  assert.equal(validateAuthHeader(reqBasic).ok, false);

  const reqEmptyBearer = { headers: { authorization: 'Bearer ' } } as IncomingMessage;
  assert.equal(validateAuthHeader(reqEmptyBearer).ok, false);

  const reqTwoPartJwt = { headers: { authorization: 'Bearer header.payload' } } as IncomingMessage;
  assert.equal(validateAuthHeader(reqTwoPartJwt).ok, false);
});

test('Gemini Security: validateAuthHeader accepts valid 3-part JWT tokens', () => {
  const reqValid = {
    headers: { authorization: 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NSJ9.c2lnbmF0dXJl' },
  } as IncomingMessage;
  assert.equal(validateAuthHeader(reqValid).ok, true);
});

test('Gemini Security: checkRateLimit throttles excessive requests per IP', () => {
  const testIp = '198.51.100.42';
  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(testIp, 5, 10000);
    assert.equal(res.ok, true);
  }
  // 6th request must exceed limit
  const resExceeded = checkRateLimit(testIp, 5, 10000);
  assert.equal(resExceeded.ok, false);
  assert.ok(resExceeded.retryAfterSeconds! > 0);
});

test('Gemini Security: getCorsHeaders narrows origin away from wildcard', () => {
  const reqWildcard = { headers: {} } as IncomingMessage;
  const headers = getCorsHeaders(reqWildcard);
  assert.notEqual(headers['Access-Control-Allow-Origin'], '*');
  assert.ok(headers['Access-Control-Allow-Origin'].includes('run.app'));

  const reqAllowed = {
    headers: { origin: 'https://ais-dev-vmo4nus7oc3syjyfbrofla-938723057487.asia-southeast1.run.app' },
  } as IncomingMessage;
  const headersAllowed = getCorsHeaders(reqAllowed);
  assert.equal(
    headersAllowed['Access-Control-Allow-Origin'],
    'https://ais-dev-vmo4nus7oc3syjyfbrofla-938723057487.asia-southeast1.run.app'
  );
});
