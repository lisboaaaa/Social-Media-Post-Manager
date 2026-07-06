"use client";

import type { ReactNode } from "react";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <StoreProvider>{children}</StoreProvider>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
