import { resolveApiBaseUrl } from '@ximchistka/shared';

function apiUrl() {
  return resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
};

let refreshPromise: Promise<boolean> | null = null;

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
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

export function getUser<T>() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? (JSON.parse(raw) as T) : null;
}

export function updateStoredUser(partial: Record<string, unknown>) {
  const current = getUser<Record<string, unknown>>() ?? {};
  localStorage.setItem('user', JSON.stringify({ ...current, ...partial }));
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${apiUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;

    const data = (await res.json()) as AuthResponse;
    const currentUser = getUser<Record<string, unknown>>();
    saveAuth({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: { ...currentUser, ...data.user },
    });
    return true;
  } catch {
    return false;
  }
}

async function refreshAccessTokenOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Refresh access token if missing or expiring within 2 minutes. */
export async function ensureValidSession(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  const exp = getTokenExpiryMs(token);
  if (exp && exp - Date.now() > 2 * 60 * 1000) return true;

  return refreshAccessTokenOnce();
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  if (method === 'POST' && !path.startsWith('/auth/')) {
    const sessionUser = getUser<{ demoExpired?: boolean }>();
    if (sessionUser?.demoExpired) {
      throw new Error('Demo muddati tugagan. Platforma admin bilan bog\'laning.');
    }
  }

  const token = getToken();
  const res = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    const refreshed = await refreshAccessTokenOnce();
    if (refreshed) return api<T>(path, options, true);

    clearAuth();
    redirectToLogin();
    throw new Error('Sessiya tugadi. Qayta kiring.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `API xatolik: ${res.status}`);
  }
  return res.json();
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
}
