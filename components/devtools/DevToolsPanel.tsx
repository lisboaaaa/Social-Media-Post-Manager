"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Wrench, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  const [buildInfo, setBuildInfo] = useState<{ commit: string; branch: string; env: string } | null>(null);

  const loadStats = async () => {
    setLoadingStats(true);
    const supabase = createClient();
    const { data: files } = await supabase.storage.from("post-media").list("", { limit: 1000 });
    const totalBytes = (files ?? []).reduce((sum, f) => sum + (f.metadata?.size ?? 0), 0);
    setStats({ fileCount: files?.length ?? 0, totalBytes });
    setLoadingStats(false);
  };

  const loadBuildInfo = async () => {
    const res = await fetch("/api/dev-tools/build-info");
    if (res.ok) setBuildInfo(await res.json());
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      loadStats();
      loadBuildInfo();
    }
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

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Development tools"
            title="Development tools"
            className="fixed bottom-4 right-4 z-40 flex size-11 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-lg hover:text-foreground"
          />
        }
      >
        <Wrench className="size-4.5" />
      </SheetTrigger>

      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Development tools</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-6">
          <Section title="Pages">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  {link.label}
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Section>

          <Separator />

          <Section title="Who am I">
            <div className="rounded-md border bg-muted/30 p-2.5 text-sm">
              <p className="font-medium">{currentUser.fullName}</p>
              <p className="text-muted-foreground">{currentUser.email}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                is_marketing: {String(currentUser.isMarketing)}
              </p>
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
              <p className="mt-1">
                {loadingStats
                  ? "Loading storage stats…"
                  : stats
                    ? `${stats.fileCount} file(s) in post-media, ~${(stats.totalBytes / 1024).toFixed(1)} KB`
                    : "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleRunPurge} disabled={purging}>
                <RefreshCw className="size-3.5" />
                {purging ? "Running…" : "Run 90-day purge now"}
              </Button>
            </div>
            {purgeResult && <p className="text-xs text-muted-foreground">{purgeResult}</p>}
          </Section>

          <Separator />

          <Section title="Build">
            {buildInfo ? (
              <p className="font-mono text-xs text-muted-foreground">
                {buildInfo.env} · {buildInfo.branch}@{buildInfo.commit}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Loading…</p>
            )}
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
