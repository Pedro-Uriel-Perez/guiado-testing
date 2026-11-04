'use strict';

const jwt = require('jsonwebtoken');
const {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
} = require('../../src/auth/tokens');

const SECRET = process.env.JWT_SECRET;
const USER_ID = '7d444840-9dc0-11d1-b245-5ffdce74fad2';

describe('access tokens', () => {
  test('round-trips subject and version', () => {
    const token = signAccessToken(USER_ID, 3);
    expect(verifyAccessToken(token)).toEqual({ sub: USER_ID, ver: 3 });
  });

  test('rejects an expired token', () => {
    const expired = jwt.sign(
      { type: 'access', ver: 0, exp: Math.floor(Date.now() / 1000) - 60 },
      SECRET,
      { subject: USER_ID },
    );
    expect(() => verifyAccessToken(expired)).toThrow(/expired/);
  });

  test('rejects a token signed with another secret', () => {
    const forged = jwt.sign({ type: 'access', ver: 0 }, 'otro-secreto', { subject: USER_ID });
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  test('rejects the "none" algorithm', () => {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      type: 'access',
      ver: 0,
      sub: USER_ID,
    })}.`;
    expect(() => verifyAccessToken(unsigned)).toThrow();
  });

  test('rejects a token of another type', () => {
    const wrongType = jwt.sign({ type: 'refresh', ver: 0 }, SECRET, { subject: USER_ID });
    expect(() => verifyAccessToken(wrongType)).toThrow('Token con formato inválido.');
  });

  test('rejects a tampered payload', () => {
    const [header, , signature] = signAccessToken(USER_ID, 0).split('.');
    const fakePayload = Buffer.from(
      JSON.stringify({ type: 'access', ver: 0, sub: 'otro-usuario' }),
    ).toString('base64url');
    expect(() => verifyAccessToken(`${header}.${fakePayload}.${signature}`)).toThrow();
  });
});

describe('refresh tokens', () => {
  test('are random and long', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(64);
  });

  test('hash is deterministic and does not contain the token', () => {
    const token = generateRefreshToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});
