import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { initialState, validateState } from '../src/treasury.js';
export class Store {
  constructor(path) { this.path = path; this.queue = Promise.resolve(); }
  async read() {
    try { const data = JSON.parse(await readFile(this.path, 'utf8')); if (!validateState(data.state) || !Array.isArray(data.users)) throw new Error('Invalid database'); return data; }
    catch (error) { if (error.code === 'ENOENT') return { users: [], state: initialState() }; throw error; }
  }
  transact(action) {
    const result = this.queue.then(async () => {
      const data = await this.read(); const value = await action(data);
      if (!validateState(data.state)) throw new Error('Accounting invariant failed');
      await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
      await writeFile(this.path + '.tmp', JSON.stringify(data), { mode: 0o600 });
      await rename(this.path + '.tmp', this.path); return value;
    });
    this.queue = result.catch(() => {}); return result;
  }
}
