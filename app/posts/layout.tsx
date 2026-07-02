import type { ReactNode } from "react";

export default function PostsLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-muted/20 px-6 py-10">{children}</div>;
}
