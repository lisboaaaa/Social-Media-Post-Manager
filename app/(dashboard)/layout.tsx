import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { PostPreviewModal } from "@/components/posts/PostPreviewModal";
import { StoreProvider } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

// PostPreviewModal lives here (not in the root providers) because it needs
// the store — mounting it only under authenticated, dashboard-only routes
// means it's never rendered while StoreProvider has no context to give it
// (signed out, or still resolving who's signed in).
//
// StoreProvider itself also lives here rather than at the app root: it
// eagerly fetches the entire board/comments/etc. payload, which a
// non-marketing session has no business receiving. proxy.ts already redirects
// non-marketing users away from these routes; this re-check is belt-and-braces
// so StoreProvider structurally cannot mount for a non-marketing session even
// if that first check is ever bypassed.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("is_marketing").eq("email", user.email).maybeSingle()
    : { data: null };
  if (!profile?.is_marketing) redirect("/suggest");

  return (
    <StoreProvider>
      <div className="flex min-h-screen flex-col bg-canvas">
        <Header />
        <main className="flex flex-1 flex-col px-6 py-6">{children}</main>
        <PostPreviewModal />
      </div>
    </StoreProvider>
  );
}
