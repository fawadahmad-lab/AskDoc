import { Briefcase, GraduationCap, Microscope } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";

const useCases = [
  {
    title: "For students",
    body: "Turn dense textbooks and lecture notes into study guides you can ask questions against.",
    icon: GraduationCap,
  },
  {
    title: "For professionals",
    body: "Get answers from contracts, manuals, and reports without rereading them top to bottom.",
    icon: Briefcase,
  },
  {
    title: "For researchers",
    body: "Tackle long papers with grounded answers and citations you can trace back to the source.",
    icon: Microscope,
  },
];

export function UseCases() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <h2 className="mx-auto max-w-[20ch] text-center text-3xl font-bold tracking-tight md:text-4xl">
            Made for reading-heavy days
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {useCases.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-2xl bg-muted/50 p-7">
                <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <item.icon className="size-5" />
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}