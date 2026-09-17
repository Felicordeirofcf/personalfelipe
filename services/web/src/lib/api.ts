import { getToken } from '@/lib/auth';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, cache: 'no-store', headers });
  const data = (await response.json().catch(() => ({}))) as { error?: string; details?: unknown } & T;
  if (!response.ok) throw new ApiError(data.error ?? 'Não foi possível concluir a solicitação.', response.status, data.details);
  return data;
}
