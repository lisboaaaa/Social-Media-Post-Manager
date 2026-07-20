import { z } from "zod";
import { buildTaggedUrl } from "@/lib/utm";
import { PLATFORMS, type Platform } from "@/lib/types";
import { McpToolError } from "./shared";

export const generateUtmLinkSchema = z.object({
  url: z.string().describe("The destination URL to tag"),
  platform: z.enum(PLATFORMS as [string, ...string[]]),
  campaign: z.string().describe("Usually the post's title — becomes the slugified utm_campaign"),
  content: z.string().optional().describe('Optional placement tag, e.g. "comment" or "story" — becomes utm_content'),
});

export type GenerateUtmLinkInput = z.infer<typeof generateUtmLinkSchema>;

// Pure function, no DB access — same tagging convention as the "Transform
// with UTM tags" hint in the post editor (lib/utm.ts).
export function generateUtmLinkTool(input: GenerateUtmLinkInput) {
  const tagged = buildTaggedUrl(input.url, input.platform as Platform, input.campaign, input.content);
  if (!tagged) throw new McpToolError(`"${input.url}" doesn't look like a valid URL.`);
  return { url: tagged };
}
