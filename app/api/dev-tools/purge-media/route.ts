import { requireMarketingSession } from "@/lib/devToolsAuth";
import { purgeOldMedia } from "@/lib/mediaPurge";

// Manual "run it now" trigger for the same job the daily cron runs — lets
// the dev tools panel demonstrate/test the purge without waiting for 3am.
export async function POST() {
  const session = await requireMarketingSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const result = await purgeOldMedia(session.supabase);
  return Response.json(result);
}
