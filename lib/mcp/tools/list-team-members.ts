import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { McpToolError } from "./shared";

export const listTeamMembersSchema = z.object({});

export type ListTeamMembersInput = z.infer<typeof listTeamMembersSchema>;

export async function listTeamMembersTool(_input: ListTeamMembersInput, supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email, is_marketing")
    .order("full_name", { ascending: true });
  if (error) throw new McpToolError(`Couldn't list team members: ${error.message}`);

  return (data ?? []).map((p: { full_name: string; email: string; is_marketing: boolean }) => ({
    fullName: p.full_name,
    email: p.email,
    isMarketing: p.is_marketing,
  }));
}
