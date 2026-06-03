const STORAGE_KEY = "cc_api_key";

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* ignore storage failures */
  }
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore storage failures */
  }
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * True only for SAME-ORIGIN requests whose path starts with `/api`. Resolving
 * against the current origin also covers absolute same-origin URLs and `Request`
 * inputs, while the origin check guarantees the key is never sent cross-origin.
 */
function isApiRequest(input: RequestInfo | URL): boolean {
  try {
    const u = new URL(urlOf(input), window.location.origin);
    if (u.origin !== window.location.origin) return false;
    return u.pathname === "/api" || u.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

/**
 * Patch window.fetch once so every same-origin `/api` request automatically
 * carries the stored `x-api-key`. An explicitly-provided header is never
 * overwritten (so the admin gate can validate a candidate key directly).
 */
export function installApiKeyFetch(): void {
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const key = getApiKey();
    if (!key || !isApiRequest(input)) return original(input, init);

    const headers = new Headers(init?.headers);
    if (!headers.has("x-api-key") && input instanceof Request) {
      input.headers.forEach((value, name) => {
        if (!headers.has(name)) headers.set(name, value);
      });
    }
    if (!headers.has("x-api-key")) headers.set("x-api-key", key);
    return original(input, { ...init, headers });
  };
}
