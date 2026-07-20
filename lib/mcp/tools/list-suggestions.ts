import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapSuggestionRow } from "@/lib/supabase/mappers";
import { McpToolError } from "./shared";

export const listSuggestionsSchema = z.object({
  status: z.enum(["new", "accepted", "dismissed"]).default("new"),
});

export type ListSuggestionsInput = z.infer<typeof listSuggestionsSchema>;

export async function listSuggestionsTool(input: ListSuggestionsInput, supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .eq("status", input.status)
    .order("created_at", { ascending: false });
  if (error) throw new McpToolError(`Couldn't list suggestions: ${error.message}`);

  const suggestions = (data ?? []).map(mapSuggestionRow);
  const submitterIds = [...new Set(suggestions.map((s) => s.submittedBy))];
  const { data: profileRows } = submitterIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", submitterIds)
    : { data: [] };
  const nameById = new Map((profileRows ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));

  return suggestions.map((s) => ({
    id: s.id,
    submittedBy: nameById.get(s.submittedBy) ?? "Unknown",
    description: s.description,
    hasImage: s.imageUrl !== null,
    status: s.status,
    createdAt: s.createdAt,
  }));
}
