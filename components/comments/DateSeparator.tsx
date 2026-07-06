export function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
