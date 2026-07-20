import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { verifyToken } from "@/lib/mcp/auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { Profile } from "@/lib/types";
import { createPostSchema, createPostTool } from "@/lib/mcp/tools/create-post";
import { listPostsSchema, listPostsTool } from "@/lib/mcp/tools/list-posts";
import { getPostSchema, getPostTool } from "@/lib/mcp/tools/get-post";
import { updatePostSchema, updatePostTool } from "@/lib/mcp/tools/update-post";
import { movePostSchema, movePostTool } from "@/lib/mcp/tools/move-post";
import { listStagesSchema, listStagesTool } from "@/lib/mcp/tools/list-stages";
import { addCommentSchema, addCommentTool } from "@/lib/mcp/tools/add-comment";
import { submitIdeaSchema, submitIdeaTool } from "@/lib/mcp/tools/submit-idea";
import { listTeamMembersSchema, listTeamMembersTool } from "@/lib/mcp/tools/list-team-members";
import { listCategoriesSchema, listCategoriesTool } from "@/lib/mcp/tools/list-categories";
import { getPostCommentsSchema, getPostCommentsTool } from "@/lib/mcp/tools/get-post-comments";
import { getPostHistorySchema, getPostHistoryTool } from "@/lib/mcp/tools/get-post-history";
import { getPostAnalyticsSchema, getPostAnalyticsTool } from "@/lib/mcp/tools/get-post-analytics";
import { assertMarketing, McpToolError } from "@/lib/mcp/tools/shared";

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
        description: "Create a new social media post tracker entry in the board's default stage. Does not publish anywhere — this app only tracks status.",
        inputSchema: createPostSchema,
      },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          assertMarketing(profile);
          return textResult(await createPostTool(input, profile, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "list_posts",
      { title: "List posts", description: "List posts, optionally filtered by status, platform, category, or target date range.", inputSchema: listPostsSchema },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          assertMarketing(profile);
          return textResult(await listPostsTool(input, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "get_post",
      { title: "Get post", description: "Get full detail for a post by its number (e.g. 123 for #123) or uuid.", inputSchema: getPostSchema },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          assertMarketing(profile);
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
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          assertMarketing(profile);
          return textResult(await updatePostTool(input, profile, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "move_post",
      {
        title: "Move post",
        description: "Change a post's workflow stage. Stages are team-editable — call list_stages first to see current valid ids and what each one requires (a target date, a published link).",
        inputSchema: movePostSchema,
      },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          assertMarketing(profile);
          return textResult(await movePostTool(input, profile, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "list_stages",
      { title: "List stages", description: "List the board's current workflow stages (ids, labels, order, and requirements) — call before move_post/create_post if you need to know valid stage ids.", inputSchema: listStagesSchema },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          assertMarketing(profile);
          return textResult(await listStagesTool(input, supabase));
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
          assertMarketing(profile);
          return textResult(await addCommentTool(input, profile, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "submit_idea",
      {
        title: "Submit idea",
        description: "Send a post idea to the marketing team for review. Available to everyone, not just marketing.",
        inputSchema: submitIdeaSchema,
      },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          return textResult(await submitIdeaTool(input, profile, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "list_team_members",
      { title: "List team members", description: "List marketing team members (name, email, whether they're marketing) — use to resolve a name before assigning a post, or to look up who's on the team.", inputSchema: listTeamMembersSchema },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          assertMarketing(profile);
          return textResult(await listTeamMembersTool(input, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "list_categories",
      { title: "List categories", description: "List existing category tags — check before creating a post with a new category name, to avoid near-duplicates.", inputSchema: listCategoriesSchema },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          assertMarketing(profile);
          return textResult(await listCategoriesTool(input, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "get_post_comments",
      { title: "Get post comments", description: "Read the comments left on a post (what people actually typed) — not the automated audit log, see get_post_history for that.", inputSchema: getPostCommentsSchema },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          assertMarketing(profile);
          return textResult(await getPostCommentsTool(input, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "get_post_history",
      { title: "Get post history", description: "Read the automated audit log for a post — who changed what field and when. Never includes the caption/description text itself, only that it changed.", inputSchema: getPostHistorySchema },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          assertMarketing(profile);
          return textResult(await getPostHistoryTool(input, supabase));
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "get_post_analytics",
      { title: "Get post analytics", description: "Read synced GA4 performance for a post — sessions, users, page views, engagement/bounce rate, per platform and per link placement (caption/comment/story).", inputSchema: getPostAnalyticsSchema },
      async (input, extra) => {
        const profile = extra.authInfo!.extra!.profile as Profile;
        const supabase = createServiceClient();
        try {
          assertMarketing(profile);
          return textResult(await getPostAnalyticsTool(input, supabase));
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
