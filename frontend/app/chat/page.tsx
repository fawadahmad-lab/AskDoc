"use client";

import * as React from "react";

import { Composer } from "@/components/chat/composer";
import { MessageThread } from "@/components/chat/message-thread";
import { useChat } from "@/components/chat/chat-context";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const { send, isBusy, startNewChat, isLoadingConversation } = useChat();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        startNewChat();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startNewChat]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-thin flex-1 overflow-y-auto px-4 md:px-6">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center py-8 md:py-10">
          {isLoadingConversation ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MessageThread />
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border/70 bg-gradient-to-t from-background via-background to-transparent px-4 pb-5 pt-3 md:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <Composer onSend={send} disabled={isBusy} />
        </div>
      </div>
    </div>
  );
}