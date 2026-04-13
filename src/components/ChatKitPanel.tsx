"use client";

import { useMemo } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";

const workflowId = process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID;

if (!workflowId) {
  throw new Error("Set NEXT_PUBLIC_CHATKIT_WORKFLOW_ID in your .env.local file.");
}

function createClientSecretFetcher(
  workflow: string,
  endpoint = "/api/create-session"
) {
  return async (currentSecret: string | null) => {
    if (currentSecret) return currentSecret;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow: { id: workflow } }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      client_secret?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to create session");
    }

    if (!payload.client_secret) {
      throw new Error("Missing client secret in response");
    }

    return payload.client_secret;
  };
}

export function ChatKitPanel() {
  const getClientSecret = useMemo(
    () => createClientSecretFetcher(workflowId!),
    []
  );

  const chatkit = useChatKit({
    api: { getClientSecret },
    attachments: {
      enabled: true,
      maxSize: 20 * 1024 * 1024, // 20MB
      maxCount: 5,
    },
  });

  return (
    <div className="flex h-[90vh] w-full rounded-2xl bg-white shadow-sm transition-colors dark:bg-slate-900">
      <ChatKit control={chatkit.control} className="h-full w-full" />
    </div>
  );
}
