import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchStages } from "./shared";

export const listStagesSchema = z.object({});

export type ListStagesInput = z.infer<typeof listStagesSchema>;

// Stages are a team-editable, shared list (not a fixed enum) — call this
// before move_post/create_post if you need to know current valid stage ids,
// their display labels, and what each one requires (a target date, a
// published link) or protects (from deletion, from further edits).
export async function listStagesTool(_input: ListStagesInput, supabase: SupabaseClient) {
  const stages = await fetchStages(supabase);
  return stages.map((s) => ({
    id: s.id,
    label: s.label,
    position: s.position,
    requiresTargetDate: s.requiresTargetDate,
    requiresPublishedUrl: s.requiresPublishedUrl,
    blocksDelete: s.blocksDelete,
  }));
}
