"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarInner } from "./sidebar";

export function MobileNav({
  onOpenLibrary,
}: {
  onOpenLibrary: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0">
        <div className="h-full">
          <SidebarInner
            collapsed={false}
            onToggle={() => {
              /* collapse is desktop-only */
            }}
            onOpenLibrary={onOpenLibrary}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
