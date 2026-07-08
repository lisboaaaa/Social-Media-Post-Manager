import { createServiceClient } from "@/lib/supabase/service";
import { purgeOldMedia } from "@/lib/mediaPurge";

// Runs daily via vercel.json's cron config. See lib/mediaPurge.ts for what
// this actually does and why.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await purgeOldMedia(createServiceClient());
  return Response.json(result);
}
