import { NextRequest, NextResponse } from "next/server";

const OPENAI_CHATKIT_URL = "https://api.openai.com/v1/chatkit/conversation";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY environment variable" },
      { status: 500 }
    );
  }

  // Forward all headers from the original request except host
  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": request.headers.get("Content-Type") || "application/json",
  };

  // Pass through any OpenAI-Beta or other relevant headers
  const betaHeader = request.headers.get("OpenAI-Beta");
  if (betaHeader) forwardHeaders["OpenAI-Beta"] = betaHeader;

  const body = await request.text();

  try {
    const upstream = await fetch(OPENAI_CHATKIT_URL, {
      method: "POST",
      headers: forwardHeaders,
      body,
    });

    // Stream the response back to the client (SSE support)
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

    // Pass the streaming body directly to the client
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to proxy request";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
