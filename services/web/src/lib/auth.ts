import { User, UserRole } from '@/types';

const TOKEN_KEY = 'consultoriafit_token';
const USER_KEY = 'consultoriafit_user';
export const SESSION_EVENT = 'consultoriafit:session';

function notifySessionChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EVENT));
}

export function saveSession(token: string, user: User) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifySessionChange();
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  notifySessionChange();
}

export function getToken() {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function getSessionUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as User; } catch { return null; }
}

export function hasRole(role: UserRole) { return getSessionUser()?.role === role; }
export function loginPath(next = '/treino') { return `/login?next=${encodeURIComponent(next)}`; }
export { TOKEN_KEY };
