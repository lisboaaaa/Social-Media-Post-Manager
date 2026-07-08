import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppBackground } from "@/components/layout/AppBackground";
import { DevToolsPanel } from "@/components/devtools/DevToolsPanel";
import { StoreProvider } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

// Same marketing-only re-check as app/(dashboard)/layout.tsx — see the
// comment there for why this lives here rather than at the app root.
export default async function PostsLayout({ children }: { children: ReactNode }) {
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
      <AppBackground />
      <div className="min-h-screen px-6 py-10">{children}</div>
      <DevToolsPanel />
    </StoreProvider>
  );
}
