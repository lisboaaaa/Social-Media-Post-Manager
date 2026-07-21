"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronDown,
  AlertTriangle,
  BarChart2,
  ExternalLink,
  Compass,
  Download,
  FlaskConical,
  Share2,
  HardDrive,
  Save,
  Sparkles,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ConnectClaudeModal } from "@/components/settings/ConnectClaudeModal";
import { createClient } from "@/lib/supabase/client";
import { useStore, type RealtimeStatus } from "@/lib/store";
import { DEFAULT_SHARE_TEMPLATE, SHARE_TEMPLATE_STORAGE_KEY, getShareTemplate } from "@/lib/shareTemplate";
import { PLATFORM_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const REALTIME_INFO: Record<RealtimeStatus, { label: string; dot: string }> = {
  connecting: { label: "Connecting…", dot: "bg-amber-500" },
  connected: { label: "Connected — live updates on", dot: "bg-emerald-500" },
  error: { label: "Error — live updates may be stale", dot: "bg-red-500" },
};

const NAV_LINKS = [
  { href: "/board", label: "Board" },
  { href: "/calendar", label: "Calendar" },
  { href: "/archive", label: "Archive" },
  { href: "/inbox", label: "Suggestions (marketing)" },
  { href: "/trash", label: "Trash" },
  { href: "/posts/new", label: "New post form" },
  { href: "/suggest", label: "Suggest (everyone)" },
  { href: "/login?preview=1", label: "Login" },
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

interface DevToolsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DevToolsPanel({ open, onOpenChange }: DevToolsPanelProps) {
  const { posts, comments, suggestions, profiles, categories, stages, realtimeStatus, addPost, addComment } = useStore();
  const [pagesExpanded, setPagesExpanded] = useState(false);
  const [stats, setStats] = useState<{ fileCount: number; totalBytes: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [syncingGa4, setSyncingGa4] = useState(false);
  const [ga4Result, setGa4Result] = useState<string | null>(null);
  const [shareTemplate, setShareTemplate] = useState(DEFAULT_SHARE_TEMPLATE);
  const [connectOpen, setConnectOpen] = useState(false);

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
    onOpenChange(next);
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

  const handleSyncGa4 = async () => {
    setSyncingGa4(true);
    setGa4Result(null);
    const res = await fetch("/api/dev-tools/sync-ga4-analytics", { method: "POST" });
    const json = await res.json();
    setSyncingGa4(false);
    if (!res.ok) {
      setGa4Result("Failed — check you're still signed in as marketing.");
      return;
    }
    setGa4Result(
      `Checked ${json.postsChecked} posts, found ${json.campaignsQueried} tagged campaign(s), updated ${json.updated}${json.errors.length ? `, ${json.errors.length} error(s): ${json.errors[0]}` : ""}.`,
    );
  };

  const handleCreateTestPost = () => {
    addPost({
      platforms: ["linkedin"],
      title: `[DEV] Test post ${new Date().toLocaleTimeString()}`,
      descriptions: { linkedin: "", instagram: "", x: "" },
      status: stages.find((s) => s.isDefaultNewPostStage)?.id ?? stages[0]?.id ?? "backlog",
      targetDate: null,
      needsChanges: false,
      keepMedia: false,
      publishedUrls: { linkedin: null, instagram: null, x: null },
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

  const handleExportCsv = () => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const headers = ["Title", "Platforms", "Status", "Target date", "Assignee", "Categories", "Published URL"];
    const rows = posts.map((p) => [
      p.title,
      p.platforms.map((platform) => PLATFORM_LABELS[platform]).join("/"),
      p.status,
      p.targetDate ?? "",
      profiles.find((pr) => pr.id === p.assigneeId)?.fullName ?? "",
      p.categoryIds.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean).join(", "),
      p.platforms.map((platform) => p.publishedUrls[platform]).filter(Boolean).join(" | "),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((value) => escape(String(value))).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `posts-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${posts.length} posts`);
  };

  const storagePercent = stats ? Math.min(100, (stats.totalBytes / STORAGE_QUOTA_BYTES) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full gap-2 overflow-y-auto bg-muted sm:max-w-md">
        <SheetHeader className="pb-0">
          <SheetTitle className="text-xl">Development tools</SheetTitle>
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

          <Section title="Connection" icon={Wifi}>
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("size-2 shrink-0 rounded-full", REALTIME_INFO[realtimeStatus].dot)} />
              {REALTIME_INFO[realtimeStatus].label}
            </div>
          </Section>

          <Section title="Claude connection" icon={Sparkles}>
            <p className="text-sm text-muted-foreground">
              Generate or revoke tokens for connecting Claude Desktop/Code/claude.ai to this app — most people won&apos;t
              need this if there&apos;s already a shared company-wide connector set up.
            </p>
            <Button type="button" variant="outline" onClick={() => setConnectOpen(true)} className="self-start">
              <Sparkles className="size-3.5" />
              Manage Claude tokens
            </Button>
          </Section>

          <Section title="Create test data" icon={FlaskConical}>
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
            <p className="text-sm text-muted-foreground">What the Share button on a post pre-fills.</p>
            <Textarea rows={3} value={shareTemplate} onChange={(e) => setShareTemplate(e.target.value)} />
            <Button type="button" size="sm" onClick={handleSaveShareTemplate} className="self-start">
              <Save className="size-3.5" />
              Save template
            </Button>
          </Section>

          <Section title="Export data" icon={Download}>
            <p className="text-sm text-muted-foreground">Download every post as a CSV file.</p>
            <Button type="button" variant="outline" onClick={handleExportCsv} className="self-start">
              <Download className="size-3.5" />
              Export {posts.length} posts as CSV
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
              <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
                Deletes media over 90 days old. Can&apos;t be undone.
              </p>
              <Button type="button" size="sm" variant="destructive" onClick={handleRunPurge} disabled={purging}>
                {purging ? "Running…" : "Run 90-day purge now"}
              </Button>
              {purgeResult && <p className="mt-2 text-xs text-muted-foreground">{purgeResult}</p>}
            </div>
          </Section>

          <Section title="Google Analytics sync" icon={BarChart2}>
            <p className="text-xs text-muted-foreground">Runs automatically once a day — this is just for testing without waiting.</p>
            {ga4Result && <p className="text-xs text-muted-foreground">{ga4Result}</p>}
            <Button type="button" size="sm" onClick={handleSyncGa4} disabled={syncingGa4} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {syncingGa4 ? "Syncing…" : "Sync GA4 analytics now"}
            </Button>
          </Section>
        </div>
      </SheetContent>
      <ConnectClaudeModal open={connectOpen} onOpenChange={setConnectOpen} />
    </Sheet>
  );
}
