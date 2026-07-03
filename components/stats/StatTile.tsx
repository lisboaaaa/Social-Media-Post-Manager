import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent: string;
}

export function StatTile({ icon: Icon, label, value, accent }: StatTileProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
      <div
        className="flex size-8 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}1f`, color: accent }}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-3xl font-semibold leading-none tracking-tight">{value}</div>
        <div className="mt-2 text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
