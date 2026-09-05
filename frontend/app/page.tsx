import type { Metadata } from "next";

import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { Steps } from "@/components/landing/steps";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { UseCases } from "@/components/landing/use-cases";
import { FeatureChecklist } from "@/components/landing/feature-checklist";
import { Faq } from "@/components/landing/faq";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Docly Chat with your documents",
  description:
    "Ask questions about your PDFs and get grounded, cited answers in seconds.",
};

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <FeatureGrid />
        <Steps />
        <UseCases />
        <FeatureChecklist />
        <Faq />
      </main>
      <LandingFooter />
    </div>
  );
}