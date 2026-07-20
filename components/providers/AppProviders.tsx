"use client";

import type { ReactNode } from "react";
import { LucideProvider } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

// StoreProvider (board/calendar/comments/etc.) lives inside the
// marketing-only layouts, not here — every other route (/login, /suggest)
// has no business fetching that payload at all.
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LucideProvider strokeWidth={1.5}>
      {children}
      <Toaster position="bottom-right" richColors />
    </LucideProvider>
  );
}
