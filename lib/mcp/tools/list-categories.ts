import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { McpToolError } from "./shared";

export const listCategoriesSchema = z.object({});

export type ListCategoriesInput = z.infer<typeof listCategoriesSchema>;

export async function listCategoriesTool(_input: ListCategoriesInput, supabase: SupabaseClient) {
  const { data, error } = await supabase.from("categories").select("name").order("name", { ascending: true });
  if (error) throw new McpToolError(`Couldn't list categories: ${error.message}`);

  return (data ?? []).map((c: { name: string }) => c.name);
}
