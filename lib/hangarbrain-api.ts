const API_BASE_URL = process.env.NEXT_PUBLIC_HB_API_URL || "http://localhost:8000";
const API_BEARER_TOKEN = process.env.NEXT_PUBLIC_HB_API_BEARER_TOKEN || null;

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function hbFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const body = options?.body;

  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (API_BEARER_TOKEN && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${API_BEARER_TOKEN}`);
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
