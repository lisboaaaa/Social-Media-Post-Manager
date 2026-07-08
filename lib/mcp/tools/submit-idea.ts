import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { uploadPostMedia, McpToolError } from "./shared";

export const submitIdeaSchema = z.object({
  description: z.string().min(1).describe("Free-text description of the post idea"),
  image: z
    .union([
      z.object({ url: z.string().url() }),
      z.object({ base64: z.string(), filename: z.string() }),
    ])
    .optional()
    .describe("Optional photo for the idea — either a URL to an already-hosted image, or base64 image bytes + filename"),
});

export type SubmitIdeaInput = z.infer<typeof submitIdeaSchema>;

export async function submitIdeaTool(input: SubmitIdeaInput, profile: Profile, supabase: SupabaseClient) {
  const imageUrl = input.image ? (await uploadPostMedia(supabase, input.image)).imageUrl : null;

  const { data, error } = await supabase
    .from("suggestions")
    .insert({ submitted_by: profile.id, description: input.description, image_url: imageUrl })
    .select("id")
    .single();
  if (error) throw new McpToolError(`Couldn't submit the idea: ${error.message}`);

  return { id: data.id, status: "new" };
}
