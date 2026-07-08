import type { ReactNode } from "react";

// No StoreProvider here — this route is open to every signed-in employee,
// not just marketing, and has no business fetching the full board payload.
export default function SuggestLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-muted/20 px-6 py-10">{children}</div>;
}
