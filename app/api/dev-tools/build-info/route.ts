import { requireMarketingSession } from "@/lib/devToolsAuth";

// Vercel injects these automatically at build time (server-side only, hence
// this small route instead of a NEXT_PUBLIC_ env var).
export async function GET() {
  const session = await requireMarketingSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  return Response.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
    env: process.env.VERCEL_ENV ?? "development",
  });
}
