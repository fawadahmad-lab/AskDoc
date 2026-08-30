"use client";

import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export function PdfPreview({
  filename,
  fileUrl,
  onClose,
}: {
  filename: string;
  fileUrl: string;
  onClose: () => void;
}) {
  const [numPages, setNumPages] = React.useState<number>(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{filename}</p>
          <p className="text-xs text-muted-foreground">
            {numPages > 0 ? `Page ${page} of ${numPages}` : "Preview"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Back to library"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-auto bg-muted/40 scrollbar-thin">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}
        <div className="flex flex-col items-center gap-3 p-4">
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              setLoading(false);
            }}
            loading={null}
          >
            <Page
              pageNumber={page}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="rounded-lg border bg-white shadow-sm"
              width={460}
            />
          </Document>
          {numPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {numPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= numPages}
                onClick={() => setPage((p) => Math.min(numPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
