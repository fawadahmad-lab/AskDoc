import {
  BookOpenText,
  FileText,
  MessageSquareText,
  Search,
  Sparkles,
} from "lucide-react";

export function BrandPanel() {
  return (
    <div className="relative flex h-full min-h-[560px] flex-col overflow-hidden bg-gradient-to-br from-[#4f46e5] via-[#5b21b6] to-[#1e1b4b] p-10 text-white">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-indigo-400/30 blur-[100px]" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-fuchsia-500/20 blur-[110px]" />
        <div className="absolute left-10 top-10 size-28 rounded-full border border-white/15" />
        <div className="absolute left-16 top-16 size-16 rounded-full border border-white/10" />
        <div className="absolute right-14 bottom-16 size-24 rounded-full border border-white/15" />
        <div className="absolute right-24 bottom-24 size-10 rounded-full border border-white/10" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:22px_22px]" />
      </div>

      <div className="relative z-10 mt-6">
        <h2 className="font-heading max-w-xs text-[30px] font-semibold leading-[1.15] tracking-tight">
          Ask your documents. Find answers.
        </h2>
        <p className="mt-3 max-w-xs text-[15px] leading-6 text-indigo-100/90">
          Upload your files, search your knowledge, and get answers grounded
          in your documents.
        </p>
      </div>

      {/* Floating app mockup */}
      <div className="relative z-10 -mt-2 flex flex-1 items-center justify-center">
        <div className="relative w-full max-w-sm">
          {/* Search / query card */}
          <div className="relative z-30 -rotate-1 rounded-2xl border border-white/20 bg-white/95 p-3.5 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.55)]">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Search className="size-4" />
              </span>
              <span className="text-sm font-medium text-slate-700">
                What does the revenue clause say?
              </span>
              <span className="ml-auto rounded-md bg-indigo-600 px-2 py-1 text-white">
                <MessageSquareText className="size-3.5" />
              </span>
            </div>
          </div>

          {/* Document card */}
          <div className="relative z-20 ml-6 mt-4 rotate-1 rounded-2xl border border-white/10 bg-white/90 p-4 shadow-[0_20px_45px_-20px_rgb(0_0_0/0.45)]">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  revenue_terms.pdf
                </p>
                <div className="mt-1.5 flex gap-1.5">
                  <span className="h-1.5 w-16 rounded-full bg-slate-200" />
                  <span className="h-1.5 w-10 rounded-full bg-slate-200" />
                  <span className="h-1.5 w-20 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          </div>

          {/* AI answer card */}
          <div className="relative z-10 -mt-2 -rotate-1 rounded-2xl border border-white/10 bg-white p-5 shadow-[0_30px_70px_-28px_rgb(0_0_0/0.6)]">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-indigo-600" />
              <p className="text-[13px] font-semibold text-slate-800">
                Docly answer
              </p>
              <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                Grounded
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <span className="block h-2 w-full rounded-full bg-slate-200" />
              <span className="block h-2 w-11/12 rounded-full bg-slate-200" />
              <span className="block h-2 w-4/5 rounded-full bg-slate-200" />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["p.12", "p.14", "p.31"].map((c) => (
                <span
                  key={c}
                  className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-600"
                >
                  {c}
                </span>
              ))}
              <span className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500">
                View sources
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-3 pb-2">
        <BookOpenText className="size-4 text-indigo-200" />
        <p className="text-[13px] text-indigo-100/80">
          Cited answers you can trust.
        </p>
      </div>
    </div>
  );
}