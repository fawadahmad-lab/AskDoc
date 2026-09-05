import { MessageSquareText, Upload } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";

const steps = [
  {
    title: "Upload your PDF",
    body: "Drag and drop a PDF into your library and it is indexed for grounded, searchable answers.",
    icon: Upload,
  },
  {
    title: "Ask and get cited answers",
    body: "Ask anything about the document. Every answer links back to the exact passages it came from.",
    icon: MessageSquareText,
  },
];

export function Steps() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <h2 className="mx-auto max-w-[20ch] text-center text-3xl font-bold tracking-tight md:text-4xl">
            How to chat with a document in 2 simple steps
          </h2>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-2 md:gap-12">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.1}>
              <div className="flex h-full flex-col items-center text-center">
                <div className="grid size-20 place-items-center rounded-[20px] bg-primary/10 text-primary">
                  <step.icon className="size-8" />
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-heading text-sm font-semibold text-primary">
                    0{i + 1}
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-2 max-w-[34ch] text-[15px] leading-7 text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}