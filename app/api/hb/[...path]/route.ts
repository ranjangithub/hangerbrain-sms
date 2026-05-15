import { NextRequest } from "next/server";

const API_BASE_URL = process.env.HB_API_URL || process.env.NEXT_PUBLIC_HB_API_URL || "http://localhost:8000";
const SERVER_BEARER_TOKEN =
  process.env.HB_API_BEARER_TOKEN || process.env.NEXT_PUBLIC_HB_API_BEARER_TOKEN || null;

function buildTargetUrl(request: NextRequest): string {
  const pathname = request.nextUrl.pathname;
  const prefix = "/api/hb";
  const strippedPath = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
  const normalizedPath = strippedPath.startsWith("/") ? strippedPath : `/${strippedPath}`;
  const apiPath = normalizedPath.startsWith("/api/") ? normalizedPath : `/api${normalizedPath}`;
  return `${API_BASE_URL}${apiPath}${request.nextUrl.search}`;
}

async function proxy(request: NextRequest): Promise<Response> {
  const targetUrl = buildTargetUrl(request);
  const headers = new Headers();

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const requestAuth = request.headers.get("authorization");
  if (requestAuth) {
    headers.set("authorization", requestAuth);
  } else if (SERVER_BEARER_TOKEN) {
    headers.set("authorization", `Bearer ${SERVER_BEARER_TOKEN}`);
  }

  const method = request.method.toUpperCase();
  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const payload = await request.arrayBuffer();
    body = payload.byteLength > 0 ? payload : undefined;
  }

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const upstreamBuffer = await upstream.arrayBuffer();
  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType);

  return new Response(upstreamBuffer, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  return proxy(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return proxy(request);
}

export async function PUT(request: NextRequest): Promise<Response> {
  return proxy(request);
}

export async function PATCH(request: NextRequest): Promise<Response> {
  return proxy(request);
}

export async function DELETE(request: NextRequest): Promise<Response> {
  return proxy(request);
}
