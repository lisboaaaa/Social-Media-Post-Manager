"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { computePersonalStats } from "@/lib/stats";
import { BarListChart } from "./BarListChart";
import { StageColumnChart } from "./StageColumnChart";
import { WeeklyTrendChart } from "./WeeklyTrendChart";
import { StatsSection } from "./StatsSection";
import { StatTile } from "./StatTile";

// Each chart keeps a single hue internally (no legend needed — one series,
// the title names it), but the hues differ across charts so the dashboard
// doesn't read as the same widget three times over with a re-skin.
const STAGE_COLOR = "#2a78d6"; // blue
const CATEGORY_COLOR = "#1baf7a"; // aqua
const TREND_COLOR = "#4a3aa7"; // violet

const NEEDS_CHANGES_COLOR = "#b45309"; // matches the amber "Needs changes" badge used elsewhere in the app

interface PersonalStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonalStatsModal({ open, onOpenChange }: PersonalStatsModalProps) {
  const { posts, categories, stages, currentUser } = useStore();

  const stats = useMemo(
    () => computePersonalStats(posts, categories, stages, currentUser.id),
    [posts, categories, stages, currentUser.id],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Your stats</DialogTitle>
          <p className="text-base text-muted-foreground">
            {stats.totalPosts > 0
              ? `${currentUser.fullName.split(" ")[0]}, you're the assignee on ${stats.totalPosts} post${stats.totalPosts === 1 ? "" : "s"}.`
              : `${currentUser.fullName.split(" ")[0]}, no posts assigned to you yet — once you are, your stats show up here.`}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2.5">
          <StatTile icon={Layers} label="Total posts" value={stats.totalPosts} accent={STAGE_COLOR} />
          <StatTile icon={CheckCircle2} label="Published" value={stats.publishedPosts} accent="#0ca30c" />
          <StatTile icon={AlertTriangle} label="Needs changes" value={stats.needsChangesPosts} accent={NEEDS_CHANGES_COLOR} />
        </div>

        <StatsSection title="Posts by stage" color={STAGE_COLOR}>
          <StageColumnChart
            color={STAGE_COLOR}
            rows={stats.byStatus.map((s) => ({
              key: s.status,
              label: s.label,
              shortLabel: s.label,
              count: s.count,
            }))}
          />
        </StatsSection>

        <StatsSection title="Top categories" color={CATEGORY_COLOR}>
          <BarListChart
            color={CATEGORY_COLOR}
            ranked
            rows={stats.topCategories.map((c) => ({ key: c.id, label: c.name, count: c.count }))}
            emptyMessage="No categories tagged yet"
          />
        </StatsSection>

        <StatsSection title="Posts published, last 10 weeks" color={TREND_COLOR}>
          <WeeklyTrendChart points={stats.weeklyActivity} color={TREND_COLOR} />
        </StatsSection>
      </DialogContent>
    </Dialog>
  );
}
