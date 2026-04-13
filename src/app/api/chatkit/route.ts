import { NextRequest, NextResponse } from "next/server";

const SESSION_URL = "https://api.openai.com/v1/chatkit/sessions";
const CONVERSATION_URL = "https://api.openai.com/v1/chatkit/conversation";

async function getClientSecret(apiKey: string): Promise<string> {
  const workflowId = process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID;
  if (!workflowId) throw new Error("Missing NEXT_PUBLIC_CHATKIT_WORKFLOW_ID");

  const res = await fetch(SESSION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ workflow: { id: workflowId } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Session creation failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { client_secret?: string };
  if (!data.client_secret) throw new Error("No client_secret in session response");
  return data.client_secret;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  let clientSecret: string;
  try {
    clientSecret = await getClientSecret(apiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const contentType = request.headers.get("Content-Type") || "application/json";
  const body = await request.text();

  const betaHeader = request.headers.get("OpenAI-Beta");
  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${clientSecret}`,
    "Content-Type": contentType,
  };
  if (betaHeader) forwardHeaders["OpenAI-Beta"] = betaHeader;

  try {
    const upstream = await fetch(CONVERSATION_URL, {
      method: "POST",
      headers: forwardHeaders,
      body,
    });

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      upstream.headers.get("Content-Type") || "text/event-stream"
    );
    responseHeaders.set("Cache-Control", "no-cache");
    responseHeaders.set("Connection", "keep-alive");

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return new NextResponse(errorText, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
