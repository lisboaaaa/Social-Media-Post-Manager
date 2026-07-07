import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { verifyToken } from "@/lib/mcp/auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { Profile } from "@/lib/types";
import { createPostSchema, createPostTool } from "@/lib/mcp/tools/create-post";
import { listPostsSchema, listPostsTool } from "@/lib/mcp/tools/list-posts";
import { getPostSchema, getPostTool } from "@/lib/mcp/tools/get-post";
import { updatePostSchema, updatePostTool } from "@/lib/mcp/tools/update-post";
import { movePostSchema, movePostTool } from "@/lib/mcp/tools/move-post";
import { addCommentSchema, addCommentTool } from "@/lib/mcp/tools/add-comment";
import { McpToolError } from "@/lib/mcp/tools/shared";

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function errorResult(error: unknown) {
  const message = error instanceof McpToolError ? error.message : "Something went wrong handling that request.";
  if (!(error instanceof McpToolError)) console.error(error);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "create_post",
      {
        title: "Create post",
        description: "Create a new social media post tracker entry in the Backlog column. Does not publish anywhere — this app only tracks status.",
        inputSchema: createPostSchema,
      },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          return textResult(await createPostTool(input, profile, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "list_posts",
      { title: "List posts", description: "List posts, optionally filtered by status, platform, category, or target date range.", inputSchema: listPostsSchema },
      async (input) => {
        const supabase = createServiceClient();
        try {
          return textResult(await listPostsTool(input, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "get_post",
      { title: "Get post", description: "Get full detail for a post by its number (e.g. 123 for #123) or uuid.", inputSchema: getPostSchema },
      async (input) => {
        const supabase = createServiceClient();
        try {
          return textResult(await getPostTool(input, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "update_post",
      {
        title: "Update post",
        description: "Partially update a post's content (title, copy, platforms, categories, date, assignee). Does not change status — use move_post for that.",
        inputSchema: updatePostSchema,
      },
      async (input) => {
        const supabase = createServiceClient();
        try {
          return textResult(await updatePostTool(input, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "move_post",
      {
        title: "Move post",
        description: "Change a post's workflow status (e.g. to 'scheduled' or 'published'). Scheduled requires a target date, Published requires a link.",
        inputSchema: movePostSchema,
      },
      async (input) => {
        const supabase = createServiceClient();
        try {
          return textResult(await movePostTool(input, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "add_comment",
      { title: "Add comment", description: "Add a comment to a post, or a general team note if postNumber is null.", inputSchema: addCommentSchema },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          return textResult(await addCommentTool(input, profile, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );
  },
  { serverInfo: { name: "socialmedia-post-manager", version: "1.0.0" } },
  // This route file lives at the fixed path /api/mcp (no [transport] segment),
  // so the endpoint mcp-handler matches requests against must be told explicitly.
  { streamableHttpEndpoint: "/api/mcp", disableSse: true },
);

const authedHandler = withMcpAuth(handler, verifyToken, { required: true });

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
