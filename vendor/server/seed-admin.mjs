#!/usr/bin/env node
// Seed the first admin user. Usage:
//   node seed-admin.mjs <email> <password>
// then `wrangler d1 execute horus-vendor --remote --command="..."` with the
// INSERT statement it prints.
import crypto from 'node:crypto';

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: node seed-admin.mjs <email> <password>');
  process.exit(1);
}
const hash = crypto.createHash('sha256').update(password).digest('hex');
const sql = `INSERT INTO admin_users (email, password_hash, display_name, role) VALUES ('${email}', '${hash}', '${email}', 'admin') ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash;`;
console.log('Run this against your D1 database:\n');
console.log(`wrangler d1 execute horus-vendor --remote --command="${sql}"`);
