import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Store } from '../backend/store.mjs';
import { passwordHash } from '../backend/auth.mjs';
const path = process.env.TREASURY_DATA || fileURLToPath(new URL('../data/treasury.json', import.meta.url));
const store = new Store(path); const accounts = [];
for (const [username, role] of [['kivanc', 'admin'], ['builder-demo', 'requester'], ['reviewer-demo', 'reviewer']]) {
  const password = randomBytes(18).toString('base64url'); accounts.push({ username, role, password, ...await passwordHash(password) });
}
await store.transact(data => { if (data.users.length) throw new Error('Workspace already has accounts. Setup will not overwrite them.'); data.users = accounts.map(({ password, ...user }) => user); });
await mkdir(dirname(path), { recursive: true, mode: 0o700 });
const file = join(dirname(path), 'local-access.txt');
await writeFile(file, 'LOCAL DEVELOPMENT ACCOUNTS — do not publish or share.\nThe demo accounts are fictional, not team members.\n\n' + accounts.map(a => `${a.username} (${a.role})\nPassword: ${a.password}`).join('\n\n'), { mode: 0o600, flag: 'wx' });
console.log(`Local accounts created. Credentials saved to ${file}. This file is excluded from Git.`);
