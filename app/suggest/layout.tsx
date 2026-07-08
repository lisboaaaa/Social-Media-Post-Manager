import type { ReactNode } from "react";

// No StoreProvider here — this route is open to every signed-in employee,
// not just marketing, and has no business fetching the full board payload.
export default function SuggestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-muted/60 via-background to-background px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full blur-3xl"
        style={{ backgroundColor: "#0A66C2", opacity: 0.12 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 size-[28rem] rounded-full blur-3xl"
        style={{ backgroundColor: "#C2185B", opacity: 0.1 }}
      />
      <div className="relative w-full">{children}</div>
    </div>
  );
}
