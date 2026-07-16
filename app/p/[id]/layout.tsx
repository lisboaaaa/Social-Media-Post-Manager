import type { ReactNode } from "react";
import { AppBackground } from "@/components/layout/AppBackground";

// No StoreProvider, no Header — this is the public, no-login post link.
// It has no session to fetch a board payload with, and no business showing
// the rest of the app's chrome to a visitor who isn't signed in at all.
export default function PublicPostLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen px-6 py-10">
      <AppBackground />
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </div>
  );
}
