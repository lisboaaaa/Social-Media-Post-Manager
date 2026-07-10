"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Wrench,
  ChevronDown,
  AlertTriangle,
  ExternalLink,
  Compass,
  FlaskConical,
  Share2,
  HardDrive,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { DEFAULT_SHARE_TEMPLATE, SHARE_TEMPLATE_STORAGE_KEY, getShareTemplate } from "@/lib/shareTemplate";
import { cn } from "@/lib/utils";

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

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-background p-4 shadow-md">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </h3>
      {children}
    </div>
  );
}

export function DevToolsPanel() {
  const { posts, comments, suggestions, addPost, addComment } = useStore();
  const [open, setOpen] = useState(false);
  const [pagesExpanded, setPagesExpanded] = useState(false);
  const [stats, setStats] = useState<{ fileCount: number; totalBytes: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [shareTemplate, setShareTemplate] = useState(DEFAULT_SHARE_TEMPLATE);

  useEffect(() => {
    // Reading a saved preference on mount — legitimate sync-with-storage case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShareTemplate(getShareTemplate());
  }, []);

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

  const handleSaveShareTemplate = () => {
    window.localStorage.setItem(SHARE_TEMPLATE_STORAGE_KEY, shareTemplate);
    toast.success("Share message template saved");
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

      <SheetContent side="right" className="w-full overflow-y-auto bg-muted/20 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Development tools</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-6">
          <Section title="Pages" icon={Compass}>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setPagesExpanded((v) => !v)}
            >
              {pagesExpanded ? "Hide pages" : "Show pages"}
              <ChevronDown className={cn("size-3.5 transition-transform", pagesExpanded && "rotate-180")} />
            </Button>
            {pagesExpanded && (
              <div className="flex flex-col gap-1 rounded-md border bg-muted/30 p-1.5">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-background"
                  >
                    {link.label}
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title="Create test data" icon={FlaskConical}>
            <p className="text-sm text-muted-foreground">
              Adds real sample content so you have something to click around with.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleCreateTestPost}>
                Test post
              </Button>
              <Button type="button" variant="outline" onClick={handleCreateTestSuggestion}>
                Test suggestion
              </Button>
              <Button type="button" variant="outline" onClick={handleCreateTestComment}>
                Test team note
              </Button>
            </div>
          </Section>

          <Section title="Share message template" icon={Share2}>
            <p className="text-sm text-muted-foreground">
              What the Share button on a post pre-fills. Use <code className="font-mono text-xs">{"{title}"}</code>{" "}
              and <code className="font-mono text-xs">{"{link}"}</code> as placeholders.
            </p>
            <Textarea rows={3} value={shareTemplate} onChange={(e) => setShareTemplate(e.target.value)} />
            <Button type="button" size="sm" onClick={handleSaveShareTemplate} className="self-start">
              <Save className="size-3.5" />
              Save template
            </Button>
          </Section>

          <Section title="Storage & media" icon={HardDrive}>
            <p className="text-sm">
              {posts.length} posts · {comments.length} comments · {suggestions.length} suggestions
            </p>
            {loadingStats ? (
              <p className="text-sm text-muted-foreground">Loading real usage from Supabase Storage…</p>
            ) : stats ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{stats.fileCount} file(s), ~{(stats.totalBytes / 1024).toFixed(1)} KB used</span>
                  <span className="font-medium text-foreground">{storagePercent.toFixed(3)}% of 1 GB</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(storagePercent, storagePercent > 0 ? 1 : 0)}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
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
