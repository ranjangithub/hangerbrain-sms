const API_PROXY_BASE = "/api/hb";

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_PROXY_BASE}${normalized}`;
}

export async function hbFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const body = options?.body;

  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HangarBrain API ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
