import { NextResponse } from "next/server";

const DEFAULT_CHATKIT_BASE = "https://api.openai.com";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY environment variable" },
      { status: 500 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  // Resolve workflow ID from body or env
  const workflow = body.workflow as Record<string, string> | undefined;
  const workflowId =
    workflow?.id ||
    (body.workflowId as string) ||
    process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID;

  if (!workflowId) {
    return NextResponse.json({ error: "Missing workflow id" }, { status: 400 });
  }

  // Generate a simple user ID (in production, use real auth)
  const userId =
    (body.userId as string) || crypto.randomUUID();

  const apiBase = process.env.CHATKIT_API_BASE || DEFAULT_CHATKIT_BASE;

  try {
    const upstream = await fetch(`${apiBase}/v1/chatkit/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "chatkit_beta=v1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflow: { id: workflowId },
        user: userId,
      }),
    });

    const payload = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const message =
        payload?.error?.message || payload?.error || "Failed to create session";
      return NextResponse.json({ error: message }, { status: upstream.status });
    }

    if (!payload.client_secret) {
      return NextResponse.json(
        { error: "Missing client secret in response" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      client_secret: payload.client_secret,
      expires_after: payload.expires_after,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to reach ChatKit API: ${error}` },
      { status: 502 }
    );
  }
}
