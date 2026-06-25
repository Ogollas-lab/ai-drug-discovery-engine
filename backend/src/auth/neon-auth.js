/**
 * Optional Neon Auth JWT verification (Google OAuth via Neon Auth).
 */
'use strict';

const NEON_JWKS = process.env.NEON_AUTH_JWKS_URL;

async function optionalNeonAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ') || !NEON_JWKS) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const { jwtVerify, createRemoteJWKSet } = await import('jose');
    const JWKS = createRemoteJWKSet(new URL(NEON_JWKS));
    const { payload } = await jwtVerify(token, JWKS);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
    };
  } catch {
    /* guest mode — invalid token ignored */
  }
  next();
}

module.exports = { optionalNeonAuth };
