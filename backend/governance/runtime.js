'use strict';

function validateRuntime(env = process.env) {
  const secret = String(env.JWT_SECRET || '');
  if (secret.length < 32 || /replace|change|example|default/i.test(secret)) {
    throw new Error('JWT_SECRET must be a non-placeholder value of at least 32 characters');
  }
  if (!env.DATABASE_URL && (!env.DB_HOST || !env.DB_NAME || !env.DB_USER || !env.DB_PASSWORD)) {
    throw new Error('Database configuration is incomplete');
  }
  if (env.NODE_ENV === 'production') {
    const origins = String(env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
    if (!origins.length || origins.includes('*')) throw new Error('Production ALLOWED_ORIGINS must be explicit');
    if (env.ALLOW_DEMO_SEED === 'true') throw new Error('Demo seed is prohibited in production');
  }
  return true;
}

module.exports = { validateRuntime };
