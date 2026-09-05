import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BrandMark, BrandWordmark } from "@/components/auth/brand-mark";

const productLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

const accountLinks = [
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Create account" },
];

export function LandingFooter() {
  return (
    <footer className="bg-deep text-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark className="size-9 rounded-xl bg-white/10 shadow-none" />
              <BrandWordmark className="text-[17px] text-white" />
            </div>
            <p className="mt-4 max-w-[34ch] text-sm leading-6 text-white/70">
              Chat with your documents and get grounded answers with citations,
              right in your library.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 h-10 rounded-lg bg-white px-6 font-semibold text-deep hover:bg-white/90"
            >
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>

          <nav aria-label="Product" className="text-sm">
            <p className="font-heading text-sm font-semibold text-white/90">
              Product
            </p>
            <ul className="mt-4 space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account" className="text-sm">
            <p className="font-heading text-sm font-semibold text-white/90">
              Account
            </p>
            <ul className="mt-4 space-y-2.5">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Docly. All rights reserved.</p>
          <p>Answers are generated with your own Groq key.</p>
        </div>
      </div>
    </footer>
  );
}