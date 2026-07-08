import type { SupabaseClient } from "@supabase/supabase-js";
import { storagePathFromPublicUrl } from "@/lib/supabase/storagePath";

// Storage (not the database) is what's actually tight on the free Supabase
// plan, and it's almost entirely photos/videos — so once a post is done
// being useful (published a while ago, or thrown in the Trash a while ago),
// its media gets removed while the post row itself (title, copy, comments,
// dates) stays forever. Called from the daily cron route and from the dev
// tools panel's manual "Run purge now" button.
export const RETENTION_DAYS = 90;

interface PostImageRow {
  id: string;
  image_url: string;
}

export interface PurgeResult {
  postsChecked: number;
  purgedImages: number;
  errors: string[];
}

export async function purgeOldMedia(supabase: SupabaseClient): Promise<PurgeResult> {
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

  for (const post of eligiblePosts) {
    const images = (post.post_images ?? []) as PostImageRow[];
    for (const image of images) {
      const path = storagePathFromPublicUrl(image.image_url);
      if (path) {
        // Duplicated posts and promoted suggestions can share the exact same
        // URL as this row — only remove the file once nothing else uses it.
        const [{ count: otherPostRefs }, { count: suggestionRefs }] = await Promise.all([
          supabase.from("post_images").select("id", { count: "exact", head: true }).eq("image_url", image.image_url).neq("id", image.id),
          supabase.from("suggestions").select("id", { count: "exact", head: true }).eq("image_url", image.image_url),
        ]);
        if ((otherPostRefs ?? 0) === 0 && (suggestionRefs ?? 0) === 0) {
          const { data: removed, error: storageError } = await supabase.storage.from("post-media").remove([path]);
          if (storageError) {
            errors.push(`storage ${path}: ${storageError.message}`);
            continue; // don't drop the DB row if the file removal didn't actually happen
          }
          if (!removed || removed.length === 0) {
            errors.push(`storage ${path}: remove() reported success but removed 0 files`);
            continue;
          }
        }
      }
      const { error: dbError } = await supabase.from("post_images").delete().eq("id", image.id);
      if (dbError) errors.push(`row ${image.id}: ${dbError.message}`);
      else purgedImages++;
    }
  }

  return { postsChecked: eligiblePosts.length, purgedImages, errors };
}
