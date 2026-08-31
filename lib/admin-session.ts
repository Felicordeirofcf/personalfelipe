import { createHmac, timingSafeEqual } from 'crypto';

export const ADMIN_COOKIE = 'evotrainer_admin_session';
const MAX_AGE = 60 * 60 * 8;
function secret() { return process.env.ADMIN_PASSWORD || ''; }
function signature(payload: string) { return createHmac('sha256', secret()).update(payload).digest('base64url'); }
export function createAdminSession() { const payload = String(Date.now() + MAX_AGE * 1000); return `${payload}.${signature(payload)}`; }
export function verifyAdminSession(value?: string | null) { if (!value || !secret()) return false; const [payload, sig] = value.split('.'); if (!payload || !sig || Number(payload) < Date.now()) return false; const expected = signature(payload); try { return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch { return false; } }
export { MAX_AGE };
