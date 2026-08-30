"use client";

import * as React from "react";
import {
  Check,
  Library,
  LogOut,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BrandMark } from "@/components/auth/brand-mark";

import { useChat } from "./chat-context";
import { useUser } from "@/lib/use-user";
import type { User } from "@/lib/auth";

export function Sidebar({
  collapsed,
  onToggle,
  onOpenLibrary,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onOpenLibrary: () => void;
}) {
  return (
    <aside
      className={cn(
        "relative hidden h-full flex-col border-r border-sidebar-border bg-sidebar md:flex",
        collapsed ? "w-[68px]" : "w-72"
      )}
    >
      <SidebarInner collapsed={collapsed} onToggle={onToggle} onOpenLibrary={onOpenLibrary} />
    </aside>
  );
}

export function SidebarInner({
  collapsed,
  onToggle,
  onOpenLibrary,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onOpenLibrary: () => void;
}) {
  const {
    startNewChat,
    conversations,
    isLoadingConversations,
    activeConversationId,
    openConversation,
    deleteConversation,
    renameConversation,
  } = useChat();
  const { user, logout } = useUser();

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-4 py-4">
        <SidebarToggleButton
          collapsed
          onToggle={onToggle}
          label="Expand sidebar"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={startNewChat}>
              <MessageSquarePlus className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">New chat</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onOpenLibrary}>
              <Library className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Library</TooltipContent>
        </Tooltip>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground">
              <UserAvatar user={user} className="size-7" />
            </button>
          </DropdownMenuTrigger>
          <UserMenu user={user} onLogout={logout} />
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 py-4">
        <SidebarToggleButton onToggle={onToggle} label="Collapse sidebar" />
        <div className="min-w-0 flex-1">
          <p className="font-heading truncate text-[15px] font-semibold">
            Ask<span className="text-primary">Docs</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Document Q&amp;A
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={onOpenLibrary} aria-label="Open library">
              <Library className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Library</TooltipContent>
        </Tooltip>
      </div>

      <div className="px-3">
        <Button className="w-full justify-between" onClick={startNewChat}>
          <span className="flex items-center gap-2">
            <MessageSquarePlus className="size-4" />
            New chat
          </span>
          <kbd className="rounded bg-primary-foreground/15 px-1.5 text-[11px]">
            ⌘N
          </kbd>
        </Button>
      </div>

      <div className="mt-6 flex items-center justify-between px-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <MessageSquare className="size-3.5" />
          Conversations
        </div>
      </div>

      <ScrollArea className="mt-2 min-h-0 flex-1 px-3">
        {isLoadingConversations ? (
          <div className="space-y-2 px-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-1 py-3 text-xs text-muted-foreground/70">
            No conversations yet. Start a new chat.
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                id={conversation.id}
                title={conversation.title}
                active={activeConversationId === conversation.id}
                onClick={() => openConversation(conversation.id)}
                onDelete={() => deleteConversation(conversation.id)}
                onRename={(title) =>
                  renameConversation(conversation.id, title || null)
                }
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <Separator />
      <div className="flex items-center gap-2 px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-sidebar-accent">
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user?.username ?? "Guest"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email || "Signed in"}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <UserMenu user={user} onLogout={logout} />
        </DropdownMenu>
      </div>
    </div>
  );
}

function SidebarToggleButton({
  onToggle,
  collapsed,
  label,
}: {
  onToggle: () => void;
  collapsed?: boolean;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onToggle}
          aria-label={label}
          className={cn(
            "flex items-center rounded-xl transition-colors hover:bg-sidebar-accent",
            collapsed ? "justify-center" : "justify-start px-1.5 py-1.5"
          )}
        >
          <BrandMark
            className={cn("size-9 rounded-xl", collapsed ? "" : "size-9")}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side={collapsed ? "right" : "bottom"}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function ConversationRow({
  id,
  title,
  active,
  onClick,
  onDelete,
  onRename,
}: {
  id: number;
  title: string | null;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(title ?? "");
  const [confirm, setConfirm] = React.useState(false);

  function commitRename() {
    onRename(draft.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        className={cn(
          "flex w-full items-center gap-1 rounded-xl p-1",
          active ? "bg-sidebar-accent" : "bg-sidebar-accent/40"
        )}
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitRename();
            }
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(title ?? "");
            }
          }}
          onBlur={() => {
            setEditing(false);
            setDraft(title ?? "");
          }}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-sm text-sidebar-foreground focus:outline-none"
          aria-label="Rename conversation"
        />
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            commitRename();
          }}
          aria-label="Save rename"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-primary hover:bg-sidebar-accent"
        >
          <Check className="size-4" />
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setEditing(false);
            setDraft(title ?? "");
          }}
          aria-label="Cancel rename"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  if (confirm) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5",
          active ? "bg-sidebar-accent/40" : ""
        )}
      >
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          Delete this conversation?
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => setConfirm(false)}
            aria-label="Cancel delete"
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent"
          >
            <X className="size-3.5" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Confirm delete conversation"
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex w-full items-center gap-1 rounded-xl transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
      )}
    >
      <button
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-3 pr-1 text-left text-sm"
      >
        <MessageSquare className="size-4 shrink-0 text-primary/70" />
        <span className="truncate">{title ?? "New conversation"}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            aria-label={`Conversation options for ${id}`}
            className={cn(
              "mr-2 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 transition-opacity hover:bg-sidebar-accent hover:text-foreground",
              active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem
            onClick={() => {
              setDraft(title ?? "");
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
    </div>
  );
}

function UserAvatar({ user, className }: { user: User | null; className?: string }) {
  const name = user?.username ?? "?";
  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarFallback className="bg-primary/15 text-primary">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function UserMenu({
  user,
  onLogout,
}: {
  user: User | null;
  onLogout: () => void;
}) {
  return (
    <DropdownMenuContent align="start" className="w-56">
      <DropdownMenuLabel>
        <p className="font-medium">{user?.username ?? "Guest"}</p>
        <p className="text-xs font-normal text-muted-foreground">
          {user?.email || "Signed in"}
        </p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
        <LogOut className="size-4" />
        Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
