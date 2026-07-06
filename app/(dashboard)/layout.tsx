import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { PostPreviewModal } from "@/components/posts/PostPreviewModal";

// PostPreviewModal lives here (not in the root providers) because it needs
// the store — mounting it only under authenticated, dashboard-only routes
// means it's never rendered while StoreProvider has no context to give it
// (signed out, or still resolving who's signed in).
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <Header />
      <main className="flex flex-1 flex-col px-6 py-6">{children}</main>
      <PostPreviewModal />
    </div>
  );
}
