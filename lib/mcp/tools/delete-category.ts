import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { McpToolError } from "./shared";

export const deleteCategorySchema = z.object({
  name: z.string().describe("The category's name (case-insensitive)"),
});

export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;

export async function deleteCategoryTool(input: DeleteCategoryInput, supabase: SupabaseClient) {
  const { data: category, error: findError } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", input.name)
    .single();
  if (findError || !category) throw new McpToolError(`No category found named "${input.name}".`);

  // post_categories rows reference this category, so they'd block the
  // delete via foreign key if not cleared first — same order the "Manage
  // categories" UI deletes in.
  await supabase.from("post_categories").delete().eq("category_id", category.id);
  const { error } = await supabase.from("categories").delete().eq("id", category.id);
  if (error) throw new McpToolError(`Couldn't delete category "${input.name}": ${error.message}`);

  return { deleted: true, name: input.name };
}
