"use client";

import type { ReactNode } from "react";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";
import { PostPreviewModal } from "@/components/posts/PostPreviewModal";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      {children}
      <PostPreviewModal />
      <Toaster position="bottom-right" richColors />
    </StoreProvider>
  );
}
