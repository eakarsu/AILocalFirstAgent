'use strict';

const pool = require('../config/database');
const { hashPassword } = require('../services/passwords');

async function main() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email.includes('@')) throw new Error('ADMIN_EMAIL is required');
  const encoded = await hashPassword(password);
  await pool.query(
    `INSERT INTO users (email, password, name, role)
     VALUES ($1, $2, $3, 'commander')
     ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password, name = EXCLUDED.name, role = 'commander'`,
    [email, encoded, process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator']
  );
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error.message);
    await pool.end().catch(() => {});
    process.exitCode = 1;
  });
