"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandMark, BrandWordmark } from "@/components/auth/brand-mark";
import { SessionProvider, useUser } from "@/lib/use-user";
import {
  getConversations,
  getDocumentFileUrl,
  deleteConversation,
  renameConversation,
} from "@/lib/api";
import type { ConversationResponse } from "@/lib/api";
import { useDocuments } from "@/components/chat/use-documents";
import { cn } from "@/lib/utils";

const PdfPreview = dynamic(
  () => import("@/components/chat/pdf-preview").then((m) => m.PdfPreview),
  { ssr: false, loading: () => null }
);

const CATEGORIES = [
  "All",
  "Documents",
  "Recent",
] as const;

export default function LibraryPage() {
  return (
    <SessionProvider>
      <AuthedLibrary />
    </SessionProvider>
  );
}

function AuthedLibrary() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="flex size-12 animate-pulse items-center justify-center rounded-2xl bg-primary/20">
          <div className="size-6 rounded-full bg-primary/50" />
        </div>
      </div>
    );
  }

  return <LibraryShell />;
}

function LibraryShell() {
  const queryClient = useQueryClient();
  const {
    documents,
    isLoading: isLoadingDocs,
    isError: isDocsError,
    deleteDocument,
  } = useDocuments();

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });
  const conversations = conversationsQuery.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation deleted");
      if (previewId && conversations.find((c) => c.id === id)?.id === previewId) {
        setPreviewId(null);
      }
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string | null }) =>
      renameConversation(id, title),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const [category, setCategory] = React.useState<(typeof CATEGORIES)[number]>("All");
  const [previewId, setPreviewId] = React.useState<number | null>(null);
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const filtered =
    category === "Recent"
      ? [...conversations].sort(
          (a, b) =>
            new Date(b.updated_at ?? 0).getTime() -
            new Date(a.updated_at ?? 0).getTime()
        )
      : conversations;

  const previewDoc =
    previewId != null ? documents.find((d) => d.id === previewId) : null;

  async function openPreview(id: number) {
    setPreviewId(id);
    setFileUrl(null);
    try {
      const url = await getDocumentFileUrl(id);
      setFileUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load preview");
    }
  }

  function closePreview() {
    setPreviewId(null);
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function onDeleteDoc(id: number) {
    deleteDocument(id, {
      onSuccess: () => {
        toast.success("Document deleted");
        if (previewId === id) closePreview();
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Could not delete document"),
    });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 px-4">
        <LinkBack />
        <div className="flex-1" />
        <div className="flex items-center gap-2 lg:hidden">
          <BrandWordmark className="text-base" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <div className="mb-8 flex items-center gap-3">
          <BrandMark className="size-10 rounded-xl" />
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Library
            </h1>
            <p className="text-sm text-muted-foreground">
              Your documents and conversations in one place.
            </p>
          </div>
        </div>

        {/* Category tiles */}
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                category === c
                  ? "bg-primary text-primary-foreground"
                  : "border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Two-column list: conversations + documents */}
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <SectionTitle icon={MessageSquare} title="Conversations" />
            <div className="mt-3 space-y-2">
              {conversationsQuery.isLoading ? (
                [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
              ) : conversations.length === 0 ? (
                <EmptyPanel
                  icon={MessageSquare}
                  title="No conversations yet"
                  hint="Start a chat in the workspace and it will appear here."
                />
              ) : (
                filtered.map((c) => (
                  <ConversationCard
                    key={c.id}
                    conversation={c}
                    onRename={(title) => renameMutation.mutate({ id: c.id, title })}
                    onDelete={() => deleteMutation.mutate(c.id)}
                  />
                ))
              )}
            </div>
          </section>

          <section>
            <SectionTitle icon={FolderOpen} title="Documents" />
            <div className="mt-3 space-y-2">
              {isLoadingDocs ? (
                [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
              ) : isDocsError ? (
                <EmptyPanel
                  icon={FileText}
                  title="Could not load documents"
                  hint="Refresh the page to try again."
                />
              ) : documents.length === 0 ? (
                <EmptyPanel
                  icon={FileText}
                  title="No documents yet"
                  hint="Upload a PDF using the + in the chat bar to start asking questions."
                />
              ) : (
                documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    filename={doc.filename}
                    onPreview={() => openPreview(doc.id)}
                    onDelete={() => onDeleteDoc(doc.id)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {/* PDF preview overlay */}
      {previewId != null && fileUrl ? (
        <PreviewOverlay>
          <PdfPreview
            filename={previewDoc?.filename ?? "Document"}
            fileUrl={fileUrl}
            onClose={closePreview}
          />
        </PreviewOverlay>
      ) : null}
    </div>
  );
}

function LinkBack() {
  return (
    <Button
      variant="ghost"
      asChild
      className="flex items-center gap-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <a href="/chat">
        <ArrowLeft className="size-4" />
        <span className="text-sm">Back to chat</span>
      </a>
    </Button>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof MessageSquare;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="size-4" />
      {title}
    </h2>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof MessageSquare;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
      <Icon className="size-6 text-muted-foreground/60" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ConversationCard({
  conversation,
  onRename,
  onDelete,
}: {
  conversation: ConversationResponse;
  onRename: (title: string | null) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(conversation.title ?? "");
  const [confirm, setConfirm] = React.useState(false);

  function commit() {
    onRename(draft.trim() || null);
    setEditing(false);
  }

  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition-colors hover:bg-muted/40">
      {editing ? (
        <>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                setEditing(false);
                setDraft(conversation.title ?? "");
              }
            }}
            className="min-w-0 flex-1 rounded-lg border bg-transparent px-2 py-1.5 text-sm focus:outline-none"
            aria-label="Rename conversation"
          />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              commit();
            }}
            aria-label="Save rename"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-primary hover:bg-muted"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setEditing(false);
              setDraft(conversation.title ?? "");
            }}
            aria-label="Cancel rename"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        </>
      ) : confirm ? (
        <div className="flex flex-1 items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            Delete this conversation?
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                setConfirm(false);
              }}
              aria-label="Cancel delete"
            >
              <X className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Confirm delete conversation"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <a
            href={`/chat?conversation=${conversation.id}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {conversation.title ?? "New conversation"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {conversation.updated_at
                  ? formatRelative(new Date(conversation.updated_at))
                  : "New"}
              </span>
            </span>
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Options for ${conversation.id}`}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-opacity hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => {
                  setDraft(conversation.title ?? "");
                  setEditing(true);
                }}
              >
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirm(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

function DocumentCard({
  filename,
  onPreview,
  onDelete,
}: {
  filename: string;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = React.useState(false);

  if (confirm) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5">
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          Delete this document?
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setConfirm(false)}
            aria-label="Cancel delete"
          >
            <X className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Confirm delete document"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition-colors hover:bg-muted/40">
      <button
        onClick={onPreview}
        className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="size-4" />
        </span>
        <span className="block truncate text-sm font-medium text-foreground">
          {filename}
        </span>
      </button>
      <button
        onClick={() => setConfirm(true)}
        aria-label={`Delete document ${filename}`}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-opacity hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function PreviewOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
      {children}
    </div>
  );
}

function formatRelative(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
