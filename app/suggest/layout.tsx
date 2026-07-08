import type { ReactNode } from "react";
import { AppBackground } from "@/components/layout/AppBackground";

// No StoreProvider here — this route is open to every signed-in employee,
// not just marketing, and has no business fetching the full board payload.
export default function SuggestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <AppBackground />
      <div className="w-full">{children}</div>
    </div>
  );
}
