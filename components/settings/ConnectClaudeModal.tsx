"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TokenRow {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface ConnectClaudeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectClaudeModal({ open, onOpenChange }: ConnectClaudeModalProps) {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [name, setName] = useState("Claude");
  const [creating, setCreating] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const loadTokens = async () => {
    const res = await fetch("/api/tokens");
    if (!res.ok) return;
    const data = await res.json();
    setTokens(data.tokens ?? []);
  };

  useEffect(() => {
    // Resetting on open (not fetch-then-set) and fetching the token list —
    // legitimate synchronize-with-server/prop cases, not derived-state.
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFreshToken(null);
      loadTokens();
    }
  }, [open]);

  const handleGenerate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Couldn't generate a token");
      const data = await res.json();
      setFreshToken(data.raw);
      await loadTokens();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't generate a token");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Couldn't revoke the token");
      return;
    }
    await loadTokens();
  };

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect to Claude</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Generate a personal token, then add this app as an MCP connector in Claude Desktop, claude.ai, or Claude
            Code, so you can create and manage posts by chatting with Claude — they&apos;ll show up here as if you
            created them yourself.
          </p>
        </DialogHeader>

        {freshToken && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="mb-2 font-medium text-amber-900">
              Copy this token now — you won&apos;t be able to see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">{freshToken}</code>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(freshToken)}>
                <Copy className="size-3.5" />
                Copy
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="token-name">Label</Label>
            <Input id="token-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Claude Desktop – laptop" />
          </div>
          <Button type="button" onClick={handleGenerate} disabled={creating}>
            Generate token
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          {tokens.length === 0 && <p className="text-sm text-muted-foreground">No tokens yet.</p>}
          {tokens.map((token) => (
            <div key={token.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{token.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {token.token_prefix}… {token.revoked_at ? "· revoked" : token.last_used_at ? `· last used ${new Date(token.last_used_at).toLocaleDateString()}` : "· never used"}
                </p>
              </div>
              {!token.revoked_at && (
                <Button type="button" size="sm" variant="ghost" onClick={() => handleRevoke(token.id)}>
                  <Trash2 className="size-3.5" />
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Point your MCP client at <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/mcp</code> with
          this token as an <code>Authorization: Bearer</code> header. Note: pasting a photo directly into a Claude.ai
          chat won&apos;t attach automatically — give Claude a URL to the image, or use Claude Code with a local file.
        </p>
      </DialogContent>
    </Dialog>
  );
}
