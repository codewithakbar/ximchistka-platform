import { resolveApiBaseUrl } from '@ximchistka/shared';

function apiUrl() {
  return resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Xatolik: ${res.status}`);
  }
  return res.json();
}

export function saveAuth(data: { accessToken: string; refreshToken: string; user: unknown }) {
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
}

export function clearAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function formatPrice(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
}
