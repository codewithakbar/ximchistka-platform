const LOCAL_API = 'http://localhost:3001/api/v1';

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isLoopbackUrl(url: string | undefined) {
  if (!url) return true;
  try {
    return isLocalHost(new URL(url).hostname);
  } catch {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }
}

function deriveProductionApiHost(hostname: string): string {
  if (hostname.startsWith('api.')) return hostname;

  const firstDot = hostname.indexOf('.');
  if (firstDot > 0 && hostname.indexOf('.', firstDot + 1) > 0) {
    return `api.${hostname.slice(firstDot + 1)}`;
  }

  return `api.${hostname}`;
}

/** Resolves API base URL (…/api/v1). Uses env in dev; auto-corrects loopback on public domains. */
export function resolveApiBaseUrl(envUrl?: string): string {
  const fromEnv =
    envUrl ??
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined);

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (!isLocalHost(hostname) && isLoopbackUrl(fromEnv)) {
      const apiHost = deriveProductionApiHost(hostname);
      return `${protocol}//${apiHost}/api/v1`;
    }
  }

  return fromEnv ?? LOCAL_API;
}

/** Resolves WebSocket / realtime base URL (API origin without path). */
export function resolveWsBaseUrl(wsEnvUrl?: string, apiEnvUrl?: string): string {
  const ws =
    wsEnvUrl ??
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_WS_URL : undefined);
  const api =
    apiEnvUrl ??
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined);

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (!isLocalHost(hostname) && isLoopbackUrl(ws ?? api)) {
      const apiHost = deriveProductionApiHost(hostname);
      return `${protocol}//${apiHost}`;
    }
  }

  if (ws && !isLoopbackUrl(ws)) return ws;

  try {
    const u = new URL(resolveApiBaseUrl(api));
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:3001';
  }
}
