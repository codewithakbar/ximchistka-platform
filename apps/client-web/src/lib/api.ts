import { resolveApiBaseUrl } from '@ximchistka/shared';

function apiUrl() {
  return resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: unknown;
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

/**
 * Access token 15 daqiqada tugaydi. Refresh bo'lmasa mijoz jimgina
 * tizimdan chiqib qolardi — shuning uchun 401 da bir marta yangilaymiz.
 */
async function refreshAccessToken(): Promise<boolean> {
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
    saveAuth(data);
    return true;
  } catch {
    return false;
  }
}

function refreshAccessTokenOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
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
    throw new Error((err as { message?: string }).message ?? `Xatolik: ${res.status}`);
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
