import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const repoRoot = process.cwd();
const authDir = path.join(repoRoot, '.auth');
const authFile = path.join(authDir, 'credentials.json');

const newPassword = process.argv[2] || process.env.NEW_ADMIN_PASSWORD;

if (!newPassword) {
  console.error('Usage: node scripts/reset-admin-password.mjs <new-password>');
  process.exit(1);
}

if (newPassword.length < 12) {
  console.error('Password must be at least 12 characters.');
  process.exit(1);
}

function scryptHash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key.toString('hex'));
    });
  });
}

async function main() {
  await fs.mkdir(authDir, { recursive: true });

  let username = 'admin';
  try {
    const raw = await fs.readFile(authFile, 'utf8');
    const existing = JSON.parse(raw);
    if (typeof existing.username === 'string' && existing.username.trim()) {
      username = existing.username;
    }
  } catch {
    // No existing credentials file; default username remains admin.
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptHash(newPassword, salt);

  const payload = {
    username,
    salt,
    hash,
    changedAt: new Date().toISOString(),
  };

  await fs.writeFile(authFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Admin password reset successfully.');
}

main().catch((error) => {
  console.error('Password reset failed.', error);
  process.exit(1);
});
