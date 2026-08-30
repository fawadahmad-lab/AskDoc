import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden bg-background">
      <BackgroundOrbs />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
        {children}
      </div>
    </div>
  );
}

function BackgroundOrbs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent" />
      <div className="animate-aurora absolute -top-32 -left-24 size-[34rem] rounded-full bg-primary/20 blur-[120px]" />
      <div className="animate-aurora absolute bottom-[-8rem] right-[-6rem] size-[30rem] rounded-full bg-accent/50 blur-[120px] [animation-delay:-6s]" />
      <div className="animate-aurora absolute top-1/3 left-1/2 size-[22rem] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[100px] [animation-delay:-12s]" />
      {/* subtle grid */}
      <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:48px_48px]" />
    </div>
  );
}
