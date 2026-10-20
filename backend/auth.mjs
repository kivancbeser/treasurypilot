import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: (await scrypt(password, salt, 64)).toString('hex') };
}
export async function verifyPassword(password, record) {
  const computed = await passwordHash(password, record.salt);
  return timingSafeEqual(Buffer.from(computed.hash, 'hex'), Buffer.from(record.hash, 'hex'));
}
export const token = () => randomBytes(32).toString('hex');
export const digest = value => createHash('sha256').update(value).digest('hex');
