"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { FileText, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getDocumentFileUrl } from "@/lib/api";
import { useDocuments } from "./use-documents";

const PdfPreview = dynamic(
  () => import("./pdf-preview").then((m) => m.PdfPreview),
  { ssr: false, loading: () => null }
);

export function LibraryDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    documents,
    isLoading,
    isError,
    upload,
    isUploading,
    uploadError,
    deleteDocument,
    isDeleting,
  } = useDocuments();

  const [previewId, setPreviewId] = React.useState<number | null>(null);
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const [uploadErrorText, setUploadErrorText] = React.useState<string | null>(
    null
  );
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      closePreview();
      setUploadErrorText(null);
    }
    onOpenChange(next);
  }

  async function handleFileSelect(file: File | undefined | null) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadErrorText("Only PDF files are supported");
      return;
    }
    setUploadErrorText(null);
    upload(file, {
      onSuccess: () => {
        toast.success("Document uploaded & indexed");
        if (inputRef.current) inputRef.current.value = "";
      },
    });
  }

  async function openPreview(id: number) {
    setPreviewId(id);
    setFileUrl(null);
    try {
      const url = await getDocumentFileUrl(id);
      setFileUrl(url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not load preview"
      );
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
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Could not delete document"
        );
      },
    });
  }

  const previewDoc =
    previewId != null ? documents.find((d) => d.id === previewId) : null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full max-w-md flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2">
              <FileText className="size-4 text-primary" />
              <SheetTitle>Library</SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenChange(false)}
              aria-label="Close library"
            >
              <X className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {previewId != null && fileUrl ? (
            <PdfPreview
              filename={previewDoc?.filename ?? "Document"}
              fileUrl={fileUrl}
              onClose={closePreview}
            />
          ) : (
            <div className="flex h-full flex-col">
              <label
                htmlFor="library-upload"
                className="group mx-4 mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <UploadCloud className="size-6 text-muted-foreground transition-colors group-hover:text-primary" />
                <input
                  ref={inputRef}
                  id="library-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) =>
                    handleFileSelect(e.target.files?.[0])
                  }
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {isUploading ? "Uploading…" : "Drop a PDF here or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Only PDF files are supported
                  </p>
                </div>
              </label>

              {(uploadErrorText || uploadError) && (
                <p className="px-5 pt-3 text-sm text-destructive">
                  {uploadErrorText ??
                    (uploadError instanceof Error
                      ? uploadError.message
                      : "Upload failed")}
                </p>
              )}

              <div className="px-5 pt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Documents
              </div>

              <div className="flex-1 px-3 pb-4 pt-2">
                {isLoading ? (
                  <div className="space-y-2 px-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-14 animate-pulse rounded-xl bg-muted"
                      />
                    ))}
                  </div>
                ) : isError ? (
                  <p className="px-1 py-4 text-sm text-muted-foreground">
                    Could not load documents.
                  </p>
                ) : documents.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No documents yet.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Upload a PDF to start asking questions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {documents.map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        filename={doc.filename}
                        onPreview={() => openPreview(doc.id)}
                        onDelete={() => onDeleteDoc(doc.id)}
                        deleting={isDeleting}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DocumentRow({
  filename,
  onPreview,
  onDelete,
  deleting,
}: {
  filename: string;
  onPreview: () => void;
  onDelete: () => void;
  deleting: boolean;
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
            disabled={deleting}
            aria-label="Confirm delete document"
          >
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted/60">
      <button
        onClick={onPreview}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-left text-sm"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate">{filename}</span>
        </span>
      </button>
      <button
        onClick={() => setConfirm(true)}
        aria-label={`Delete document ${filename}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
