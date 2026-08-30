"use client";

import * as React from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDocuments } from "./use-documents";

export function UploadDocumentDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const { upload, isUploading, uploadError } = useDocuments();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function submit() {
    if (!file) return;
    upload(file, {
      onSuccess: () => {
        toast.success("Document uploaded & indexed");
        setOpen(false);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <FileUp className="size-4" />
            Upload document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
          <DialogDescription>
            Select a PDF — we&apos;ll extract, index, and ground your answers in
            it.
          </DialogDescription>
        </DialogHeader>

        <label
          htmlFor="document-upload"
          className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            file
              ? "border-primary/50 bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/40"
          }`}
        >
          <UploadCloud className="size-8 text-muted-foreground transition-colors group-hover:text-primary" />
          <input
            ref={inputRef}
            id="document-upload"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFile}
          />
          {file ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB PDF
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Drop a PDF here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Only PDF files are supported
              </p>
            </div>
          )}
        </label>

        {uploadError && (
          <p className="text-sm text-destructive">
            {uploadError instanceof Error ? uploadError.message : "Upload failed"}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!file || isUploading}>
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            Upload & index
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
