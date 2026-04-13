"use client";

import { ChatKit, useChatKit } from "@openai/chatkit-react";

const domainKey = process.env.NEXT_PUBLIC_CHATKIT_DOMAIN_KEY;

if (!domainKey) {
  throw new Error("Set NEXT_PUBLIC_CHATKIT_DOMAIN_KEY in your .env.local file.");
}

export function ChatKitPanel() {
  const chatkit = useChatKit({
    api: {
      url: "/api/chatkit",
      domainKey: domainKey!,
      uploadStrategy: {
        type: "direct",
        uploadUrl: "/api/upload-file",
      },
    },
    composer: {
      attachments: {
        enabled: true,
        maxSize: 20 * 1024 * 1024, // 20MB
        maxCount: 5,
      },
    },
  });

  return (
    <div className="flex h-[90vh] w-full rounded-2xl bg-white shadow-sm transition-colors dark:bg-slate-900">
      <ChatKit control={chatkit.control} className="h-full w-full" />
    </div>
  );
}
