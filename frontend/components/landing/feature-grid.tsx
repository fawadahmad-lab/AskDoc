import {
  KeyRound,
  Languages,
  Library,
  Lock,
  ScanSearch,
  Zap,
} from "lucide-react";

import { Reveal } from "@/components/landing/reveal";

const features = [
  {
    title: "Grounded, cited answers",
    body: "Every answer links back to the exact passages it was drawn from, so you can verify what the model says.",
    icon: ScanSearch,
  },
  {
    title: "Your documents stay yours",
    body: "Files and conversations are stored per account and never shared with other users.",
    icon: Lock,
  },
  {
    title: "Bring your own AI key",
    body: "Answers are generated with the Groq API key on your account, not shared infrastructure.",
    icon: KeyRound,
  },
  {
    title: "Ask in any language",
    body: "Ask follow-ups in any language; the retrieval and answer pipeline works with the docs you upload.",
    icon: Languages,
  },
  {
    title: "A library, not a single chat",
    body: "Keep every conversation attached to the document it came from and jump back in anytime.",
    icon: Library,
  },
  {
    title: "Fast retrieval",
    body: "Vector search over your documents returns the relevant context in seconds, not minutes.",
    icon: Zap,
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <h2 className="mx-auto max-w-[18ch] text-center text-3xl font-bold tracking-tight md:text-4xl">
            Simple, yet powerful features
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-pretty text-center text-[15px] leading-7 text-muted-foreground">
            A focused document assistant that answers from your files with
            citations you can trust.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 3) * 0.08}>
              <div className="h-full rounded-2xl border bg-card p-6 shadow-[var(--shadow-softer)] transition-shadow hover:shadow-[var(--shadow-card)]">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="mt-5 text-[17px] font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}