import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type AuthTokens = { accessToken: string; refreshToken: string };

let refreshPromise: Promise<boolean> | null = null;

export async function getToken() {
  return AsyncStorage.getItem('accessToken');
}

/**
 * Access token 15 daqiqada tugaydi — 401 da refresh token bilan bir marta
 * yangilab, so'rovni takrorlaymiz.
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;

    const data = (await res.json()) as AuthTokens;
    await saveAuth(data);
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

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    if (await refreshAccessTokenOnce()) return api<T>(path, options, true);
    await clearAuth();
    throw new Error('Sessiya tugadi. Qayta kiring.');
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `API ${res.status}`);
  }
  return res.json();
}

export async function saveAuth(data: AuthTokens) {
  await AsyncStorage.multiSet([
    ['accessToken', data.accessToken],
    ['refreshToken', data.refreshToken],
  ]);
}

export async function clearAuth() {
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
}

export function formatPrice(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + " so'm";
}
