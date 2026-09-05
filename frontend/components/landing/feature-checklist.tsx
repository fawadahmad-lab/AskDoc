import { BookOpen, Check, FileText, MessageSquareText } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";

const checklist = [
  "One-click PDF upload with instant indexing",
  "Cited sources on every answer",
  "Private, per-user AI keys",
  "Unlimited conversations per document",
  "Files and chats stay on your account",
];

function LibraryPreview() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-[20px] border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b pb-3">
        <p className="text-sm font-semibold tracking-tight">Library</p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          2 documents
        </span>
      </div>
      <ul className="divide-y">
        <li className="flex items-center gap-3 py-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">annual-report.pdf</p>
            <p className="text-[11px] text-muted-foreground">12 pages</p>
          </div>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            3 chats
          </span>
        </li>
        <li className="flex items-center gap-3 py-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">
              ml-notes-compiled.pdf
            </p>
            <p className="text-[11px] text-muted-foreground">8 pages</p>
          </div>
          <span className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <MessageSquareText className="size-3" />
            1 chat
          </span>
        </li>
      </ul>
    </div>
  );
}

export function FeatureChecklist() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 md:grid-cols-2">
        <Reveal>
          <div>
            <h2 className="max-w-[16ch] text-3xl font-bold tracking-tight md:text-4xl">
              Everything your library needs
            </h2>
            <ul className="mt-8 space-y-4">
              {checklist.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-[15px] leading-6 text-foreground/90">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="px-2">
            <LibraryPreview />
          </div>
        </Reveal>
      </div>
    </section>
  );
}