import { fileURLToPath } from 'node:url';
import { Store } from '../backend/store.mjs';
import { passwordHash } from '../backend/auth.mjs';
const [username, role] = process.argv.slice(2);
if (!/^[a-z][a-z0-9_-]{2,31}$/.test(username || '') || !['admin', 'requester', 'reviewer'].includes(role)) throw new Error('Usage: node scripts/add-user.mjs username admin|requester|reviewer. Supply password via stdin (12–128 characters).');
let password = ''; for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, '');
if (password.length < 12 || password.length > 128) throw new Error('Password must contain 12–128 characters.');
const credentials = await passwordHash(password);
const store = new Store(process.env.TREASURY_DATA || fileURLToPath(new URL('../data/treasury.json', import.meta.url)));
await store.transact(data => {
  if (data.users.some(u => u.username === username)) throw new Error('Username already exists');
  data.users.push({ username, role, ...credentials });
});
console.log(`Created ${role} account: ${username}`);
