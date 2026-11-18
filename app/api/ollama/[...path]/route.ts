import { NextRequest, NextResponse } from "next/server";

function resolveTargetBase(request: NextRequest): string {
  const headerUrl = request.headers.get("x-ollama-base-url");
  if (headerUrl && headerUrl.trim()) {
    return headerUrl.trim().replace(/\/+$/, "");
  }

  const envUrl = process.env.OLLAMA_BASE_URL || process.env.NEXT_PUBLIC_OLLAMA_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  return "http://localhost:11434";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetBase = resolveTargetBase(request);
  const subpath = (path || []).join("/");
  const url = new URL(request.url);
  const targetUrl = `${targetBase}/${subpath}${url.search}`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "ngrok-skip-browser-warning": "true",
        "bypass-tunnel-reminder": "true",
      },
      signal: AbortSignal.timeout(6000),
    });

    const responseHeaders = new Headers();
    const contentType = upstreamRes.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("Content-Type", contentType);
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isLocalhostTarget = /localhost|127\.0\.0\.1/i.test(targetBase);
    const isVercel = Boolean(process.env.VERCEL);

    let helpText = message;
    if (isVercel && isLocalhostTarget) {
      helpText = `Cannot reach '${targetBase}' from Vercel cloud servers. When deployed, localhost refers to Vercel's serverless container, not your computer. Expose your local Ollama using Cloudflare Tunnel or ngrok (e.g. 'ngrok http 11434'), then configure OLLAMA_BASE_URL or enter the tunnel URL in the UI.`;
    }

    return NextResponse.json(
      {
        error: `Ollama proxy GET failed: ${helpText}`,
        targetUrl,
      },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetBase = resolveTargetBase(request);
  const subpath = (path || []).join("/");
  const url = new URL(request.url);
  const targetUrl = `${targetBase}/${subpath}${url.search}`;

  try {
    const bodyBuffer = await request.arrayBuffer();

    const upstreamRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
        "Accept": "*/*",
        "ngrok-skip-browser-warning": "true",
        "bypass-tunnel-reminder": "true",
      },
      body: bodyBuffer,
    });

    const responseHeaders = new Headers();
    const contentType = upstreamRes.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("Content-Type", contentType);
    }
    // Disable caching for streaming responses
    responseHeaders.set("Cache-Control", "no-cache, no-transform");

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isLocalhostTarget = /localhost|127\.0\.0\.1/i.test(targetBase);
    const isVercel = Boolean(process.env.VERCEL);

    let helpText = message;
    if (isVercel && isLocalhostTarget) {
      helpText = `Cannot reach '${targetBase}' from Vercel cloud servers. Expose your local Ollama using a secure tunnel (e.g. 'ngrok http 11434' or Cloudflare Tunnel) and configure OLLAMA_BASE_URL.`;
    }

    return NextResponse.json(
      {
        error: `Ollama proxy POST failed: ${helpText}`,
        targetUrl,
      },
      { status: 502 }
    );
  }
}
