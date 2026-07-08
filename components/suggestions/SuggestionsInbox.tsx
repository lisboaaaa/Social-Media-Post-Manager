"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import type { Suggestion, SuggestionStatus } from "@/lib/types";

const TABS: { value: SuggestionStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "accepted", label: "Accepted" },
  { value: "dismissed", label: "Dismissed" },
];

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const { profiles, promoteSuggestion, dismissSuggestion } = useStore();
  const router = useRouter();
  const submitter = profiles.find((p) => p.id === suggestion.submittedBy);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
      <div className="flex items-center gap-2">
        <Avatar size="sm">
          <AvatarFallback className="text-[9px]">{submitter?.initials ?? "?"}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{submitter?.fullName ?? "Unknown"}</span>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          {format(new Date(suggestion.createdAt), "MMM d, HH:mm")}
        </span>
      </div>

      <p className="text-sm text-foreground/90">{suggestion.description}</p>

      {suggestion.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={suggestion.imageUrl} alt="" className="h-32 w-full max-w-xs rounded-md object-cover" />
      )}

      {suggestion.status === "new" && (
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => router.push(`/posts/${promoteSuggestion(suggestion).id}`)}>
            Turn into post
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => dismissSuggestion(suggestion.id)}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

export function SuggestionsInbox() {
  const { suggestions } = useStore();
  const [tab, setTab] = useState<SuggestionStatus>("new");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Suggestions</h1>

      <Tabs value={tab} onValueChange={(value) => setTab(value as SuggestionStatus)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              {t.value === "new" && suggestions.some((s) => s.status === "new") && (
                <span className="ml-1 size-1.5 shrink-0 rounded-full bg-destructive" aria-label="New" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => {
          const filtered = suggestions.filter((s) => s.status === t.value);
          return (
            <TabsContent key={t.value} value={t.value} className="mt-4 flex flex-col gap-3">
              {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
              {filtered.map((s) => (
                <SuggestionCard key={s.id} suggestion={s} />
              ))}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
