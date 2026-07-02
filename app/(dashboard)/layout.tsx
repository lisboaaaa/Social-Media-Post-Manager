import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <Header />
      <main className="flex flex-1 flex-col px-6 py-6">{children}</main>
    </div>
  );
}
