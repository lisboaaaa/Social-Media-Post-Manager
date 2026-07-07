import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateToken } from "@/lib/mcp/auth";

async function currentProfileId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data } = await supabase.from("profiles").select("id").eq("email", user.email).single();
  return data?.id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const profileId = await currentProfileId(supabase);
  if (!profileId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await supabase
    .from("api_tokens")
    .select("id, name, token_prefix, created_at, last_used_at, revoked_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tokens: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const profileId = await currentProfileId(supabase);
  if (!profileId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Claude";

  const { raw, hash, prefix } = generateToken();
  const { data, error } = await supabase
    .from("api_tokens")
    .insert({ profile_id: profileId, name, token_hash: hash, token_prefix: prefix })
    .select("id, name, token_prefix, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token: data, raw });
}
