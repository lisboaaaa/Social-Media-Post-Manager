"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Wrench, ChevronDown, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";

const NAV_LINKS = [
  { href: "/board", label: "Board" },
  { href: "/calendar", label: "Calendar" },
  { href: "/archive", label: "Archive" },
  { href: "/inbox", label: "Suggestions (marketing)" },
  { href: "/trash", label: "Trash" },
  { href: "/posts/new", label: "New post form" },
  { href: "/suggest", label: "Suggest (everyone)" },
  { href: "/login", label: "Login" },
];

// Supabase's free tier storage quota — what "Storage & media" below is
// measuring usage against.
const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function DevToolsPanel() {
  const { currentUser, posts, comments, suggestions, addPost, addComment } = useStore();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<{ fileCount: number; totalBytes: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  const loadStats = async () => {
    setLoadingStats(true);
    // A real Supabase Storage API call — this lists the actual objects in
    // the post-media bucket and sums their real stored file sizes, it's not
    // an estimate or mocked number.
    const supabase = createClient();
    const { data: files } = await supabase.storage.from("post-media").list("", { limit: 1000 });
    const totalBytes = (files ?? []).reduce((sum, f) => sum + (f.metadata?.size ?? 0), 0);
    setStats({ fileCount: files?.length ?? 0, totalBytes });
    setLoadingStats(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) loadStats();
  };

  const handleRunPurge = async () => {
    setPurging(true);
    setPurgeResult(null);
    const res = await fetch("/api/dev-tools/purge-media", { method: "POST" });
    const json = await res.json();
    setPurging(false);
    if (!res.ok) {
      setPurgeResult("Failed — check you're still signed in as marketing.");
      return;
    }
    setPurgeResult(`Checked ${json.postsChecked} posts, purged ${json.purgedImages} image(s)${json.errors.length ? `, ${json.errors.length} error(s)` : ""}.`);
    loadStats();
  };

  const handleCreateTestPost = () => {
    addPost({
      platforms: ["linkedin"],
      title: `[DEV] Test post ${new Date().toLocaleTimeString()}`,
      descriptions: { linkedin: "", instagram: "", x: "" },
      status: "backlog",
      targetDate: null,
      needsChanges: false,
      publishedUrl: null,
      assigneeId: null,
      requestedById: null,
      categoryIds: [],
      images: [],
    });
    toast.success("Test post added to Backlog");
  };

  const handleCreateTestSuggestion = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from("suggestions")
      .insert({ description: `[DEV] Test suggestion ${new Date().toLocaleTimeString()}` });
    if (error) toast.error(`Couldn't create test suggestion: ${error.message}`);
    else toast.success("Test suggestion added");
  };

  const handleCreateTestComment = () => {
    addComment(null, `[DEV] Test team note ${new Date().toLocaleTimeString()}`);
    toast.success("Test team note added");
  };

  const storagePercent = stats ? Math.min(100, (stats.totalBytes / STORAGE_QUOTA_BYTES) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Development tools"
            title="Development tools"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          />
        }
      >
        <Wrench className="size-4" />
      </SheetTrigger>

      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Development tools</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-6">
          <Section title="Pages">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="outline" className="w-full justify-between" />}>
                Open a page
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[var(--anchor-width)]">
                {NAV_LINKS.map((link) => (
                  <DropdownMenuItem key={link.href} render={<Link href={link.href} onClick={() => setOpen(false)} />}>
                    {link.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </Section>

          <Separator />

          <Section title="Who am I">
            <div className="flex items-center justify-between rounded-md border bg-muted/30 p-2.5 text-sm">
              <div>
                <p className="font-medium">{currentUser.fullName}</p>
                <p className="text-muted-foreground">{currentUser.email}</p>
              </div>
              <Badge variant="secondary">Marketing team</Badge>
            </div>
          </Section>

          <Separator />

          <Section title="View as">
            <p className="text-sm text-muted-foreground">
              Non-marketing employees land on <code className="font-mono text-xs">/suggest</code>{" "}
              instead of the board — this is exactly what they see (you can visit it too, marketing isn&apos;t
              blocked from it).
            </p>
            <Link href="/suggest" onClick={() => setOpen(false)} className="text-sm text-primary underline underline-offset-2">
              Open /suggest
            </Link>
          </Section>

          <Separator />

          <Section title="Create test data">
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleCreateTestPost}>
                Test post
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleCreateTestSuggestion}>
                Test suggestion
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleCreateTestComment}>
                Test team note
              </Button>
            </div>
          </Section>

          <Separator />

          <Section title="Storage & media">
            <div className="rounded-md border bg-muted/30 p-2.5 text-sm">
              <p>{posts.length} posts · {comments.length} comments · {suggestions.length} suggestions</p>
              {loadingStats ? (
                <p className="mt-2 text-muted-foreground">Loading real usage from Supabase Storage…</p>
              ) : stats ? (
                <div className="mt-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{stats.fileCount} file(s) in post-media, ~{(stats.totalBytes / 1024).toFixed(1)} KB used</span>
                    <span className="font-medium text-foreground">{storagePercent.toFixed(3)}% of 1 GB</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(storagePercent, storagePercent > 0 ? 1 : 0)}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
              <p className="mb-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                Permanently deletes photos/videos (not the posts themselves) from anything Published or in Trash for
                more than 90 days. Runs automatically every night — this button just lets you run it on demand
                instead of waiting. Can&apos;t be undone.
              </p>
              <Button type="button" size="sm" variant="destructive" onClick={handleRunPurge} disabled={purging}>
                {purging ? "Running…" : "Run 90-day purge now"}
              </Button>
              {purgeResult && <p className="mt-2 text-xs text-muted-foreground">{purgeResult}</p>}
            </div>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
