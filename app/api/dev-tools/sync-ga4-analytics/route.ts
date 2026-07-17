import { requireMarketingSession } from "@/lib/devToolsAuth";
import { syncGa4Analytics } from "@/lib/ga4Sync";

// Manual "run it now" trigger for the same job the daily cron runs — lets
// the dev tools panel test the GA4 sync without waiting for the schedule.
export async function POST() {
  const session = await requireMarketingSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const result = await syncGa4Analytics(session.supabase);
  return Response.json(result);
}
