import { createServiceClient } from "@/lib/supabase/service";

// Storage (not the database) is what's actually tight on the free Supabase
// plan, and it's almost entirely photos/videos — so once a post is done
// being useful (published a while ago, or thrown in the Trash a while ago),
// its media gets removed while the post row itself (title, copy, comments,
// dates) stays forever. Runs daily via vercel.json's cron config.
const RETENTION_DAYS = 90;

interface PostImageRow {
  id: string;
  image_url: string;
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = "/post-media/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const cutoffTimestamp = cutoff.toISOString();

  const [{ data: published }, { data: trashed }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, post_images(id, image_url)")
      .eq("status", "published")
      .lt("target_date", cutoffDate),
    supabase
      .from("posts")
      .select("id, post_images(id, image_url)")
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoffTimestamp),
  ]);

  const eligiblePosts = [...(published ?? []), ...(trashed ?? [])];
  let purgedImages = 0;
  const errors: string[] = [];
  const debug: unknown[] = [];

  for (const post of eligiblePosts) {
    const images = (post.post_images ?? []) as PostImageRow[];
    for (const image of images) {
      const path = storagePathFromPublicUrl(image.image_url);
      let storageResult: unknown = null;
      if (path) {
        const { data: removeData, error: storageError } = await supabase.storage.from("post-media").remove([path]);
        storageResult = { removeData, storageError };
        if (storageError) errors.push(`storage ${path}: ${storageError.message}`);
      }
      debug.push({ imageId: image.id, url: image.image_url, extractedPath: path, storageResult });
      const { error: dbError } = await supabase.from("post_images").delete().eq("id", image.id);
      if (dbError) errors.push(`row ${image.id}: ${dbError.message}`);
      else purgedImages++;
    }
  }

  return Response.json({ postsChecked: eligiblePosts.length, purgedImages, errors, debug });
}
