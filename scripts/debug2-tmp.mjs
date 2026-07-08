import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const CRON_SECRET = "dd02d8cd44bd3bc7d05e8851ab8063043df4a9350cc075d52361d35eefea3775";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: laura } = await admin.from("profiles").select("id").eq("email", "laura.lisboa@daredata.engineering").single();

const path = `debug2-${Date.now()}.png`;
const oldDateStr = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

await admin.storage.from("post-media").upload(path, Buffer.from("real test bytes"), { contentType: "image/png" });
const { data: urlData } = admin.storage.from("post-media").getPublicUrl(path);
console.log("Uploaded:", path, "->", urlData.publicUrl);

const { data: post } = await admin
  .from("posts")
  .insert({ title: "[TEST] debug2", status: "published", target_date: oldDateStr, created_by: laura.id })
  .select("id")
  .single();
await admin.from("post_images").insert({ post_id: post.id, image_url: urlData.publicUrl, position: 0 });

const res = await fetch("https://socialmediapostmanager.vercel.app/api/cron/purge-old-media", {
  headers: { Authorization: `Bearer ${CRON_SECRET}` },
});
const json = await res.json();
console.log(JSON.stringify(json, null, 2));

const after = await admin.storage.from("post-media").download(path);
console.log("File still exists after?", !after.error);

await admin.from("posts").delete().eq("id", post.id);
await admin.storage.from("post-media").remove([path]);
