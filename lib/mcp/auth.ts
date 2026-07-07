import { createHash, randomBytes } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createServiceClient } from "@/lib/supabase/service";
import { mapProfileRow } from "@/lib/supabase/mappers";
import type { Profile } from "@/lib/types";

export const TOKEN_PREFIX = "smpm_";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateToken(): { raw: string; hash: string; prefix: string } {
  const raw = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { raw, hash: sha256Hex(raw), prefix: raw.slice(0, 12) };
}

// Resolves a Claude-supplied bearer token to the profile that owns it. Every
// MCP tool call attributes its writes to this profile — same as a browser
// write attributes to whoever is signed in.
export async function verifyToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const supabase = createServiceClient();
  const hash = sha256Hex(bearerToken);

  const { data } = await supabase
    .from("api_tokens")
    .select("id, revoked_at, profiles(*)")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .single();

  if (!data || !data.profiles) return undefined;

  void supabase.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then();

  const profile = mapProfileRow(data.profiles as unknown as Parameters<typeof mapProfileRow>[0]);

  return {
    token: bearerToken,
    clientId: profile.id,
    scopes: ["posts:read", "posts:write"],
    extra: { profile } satisfies { profile: Profile },
  };
}
