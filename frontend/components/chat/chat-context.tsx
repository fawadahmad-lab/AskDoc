"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  chat,
  deleteConversation,
  getConversation,
  getConversations,
  renameConversation,
} from "@/lib/api";
import type { MessageResponse } from "@/lib/api";
import type { Message } from "./types";

type ChatContextValue = {
  messages: Message[];
  isBusy: boolean;
  selectedDocumentId: number | null;
  activeConversationId: number | null;
  conversations: ConversationSummary[];
  isLoadingConversations: boolean;
  isLoadingConversation: boolean;
  send: (text: string) => void;
  startNewChat: () => void;
  openConversation: (id: number) => void;
  deleteConversation: (id: number) => void;
  renameConversation: (id: number, title: string | null) => void;
  setSelectedDocument: (id: number | null) => void;
};

type ConversationSummary = {
  id: number;
  title: string | null;
  updatedAt: string | null;
};

const ChatContext = React.createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = React.useState<
    number | null
  >(null);
  const [activeConversationId, setActiveConversationId] = React.useState<
    number | null
  >(null);
  const [isLoadingConversation, setIsLoadingConversation] =
    React.useState(false);

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });

  const conversations: ConversationSummary[] = React.useMemo(
    () =>
      (conversationsQuery.data ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updated_at,
      })),
    [conversationsQuery.data]
  );

  const chatMutation = useMutation({
    mutationFn: chat,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (id === activeConversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string | null }) =>
      renameConversation(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const isBusy = chatMutation.isPending;

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Optimistically append an empty, "thinking" assistant placeholder.
    const placeholder: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, placeholder]);

    chatMutation.mutate(
      {
        question: trimmed,
        document_id: selectedDocumentId,
        conversation_id: activeConversationId,
      },
      {
        onSuccess: (data) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholder.id
                ? {
                    ...m,
                    content: data.answer,
                    citations: data.citations,
                    cached: data.cached,
                  }
                : m
            )
          );

          // The backend lazily created the conversation on first send.
          if (data.conversation_id != null) {
            setActiveConversationId(data.conversation_id);
          }
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholder.id
                ? {
                    ...m,
                    content:
                      err instanceof Error
                        ? err.message
                        : "Something went wrong",
                    error: true,
                  }
                : m
            )
          );
        },
      }
    );
  }

  async function openConversation(id: number) {
    if (id === activeConversationId && messages.length > 0) return;
    setActiveConversationId(id);
    setIsLoadingConversation(true);
    try {
      const detail = await getConversation(id);
      setMessages(detail.messages.map(toUiMessage));
    } catch (err) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            err instanceof Error ? err.message : "Could not load conversation",
          error: true,
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setIsLoadingConversation(false);
    }
  }

  function startNewChat() {
    setActiveConversationId(null);
    setMessages([]);
  }

  function setSelectedDocument(id: number | null) {
    setSelectedDocumentId(id);
  }

  return (
    <ChatContext.Provider
      value={{
        messages,
        isBusy,
        selectedDocumentId,
        activeConversationId,
        conversations,
        isLoadingConversations: conversationsQuery.isLoading,
        isLoadingConversation,
        send,
        startNewChat,
        openConversation,
        deleteConversation: deleteMutation.mutate,
        renameConversation: (id, title) =>
          renameMutation.mutate({ id, title }),
        setSelectedDocument,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = React.useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}

function toUiMessage(message: MessageResponse): Message {
  return {
    id: `server-${message.id}`,
    role: message.role,
    content: message.content,
    citations: message.citations ?? [],
    createdAt: message.created_at
      ? new Date(message.created_at).getTime()
      : Date.now(),
  };
}