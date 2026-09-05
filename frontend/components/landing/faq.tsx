import { ChevronDown } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";

const faqs = [
  {
    q: "Is Docly free?",
    a: "Docly is free to use. You bring the Groq API key on your account, so you only pay whatever the model itself costs.",
  },
  {
    q: "Why do I need a Groq API key?",
    a: "Each account stores its own key, and every request runs against it. That keeps your documents and prompts private and away from shared infrastructure.",
  },
  {
    q: "What files can I chat with?",
    a: "Docly currently supports PDF documents. Other formats such as DOCX, XLSX, and PPTX are on the roadmap.",
  },
  {
    q: "Are my documents private?",
    a: "Yes. Documents and conversations are stored per account and never shared with other users. You control everything and can delete any file at any time.",
  },
  {
    q: "How do citations work?",
    a: "Answers are grounded in passages retrieved from your document. Each answer links back to the source text so you can verify it in seconds.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Frequently asked questions
          </h2>
        </Reveal>

        <div className="mt-12 space-y-3">
          {faqs.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.04}>
              <details className="group rounded-2xl border bg-card px-5 py-4 transition-colors open:bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-3 max-w-[60ch] text-[14px] leading-6 text-muted-foreground">
                  {item.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}