"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const COMPANY_DOMAIN = "@daredata.engineering";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed.endsWith(COMPANY_DOMAIN)) {
      toast.error(`Use your company email (${COMPANY_DOMAIN}).`);
      return;
    }

    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);

    if (error) {
      toast.error(`Couldn't send the link: ${error.message}`);
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border p-6">
        <h1 className="text-lg font-semibold tracking-tight">Social Media Post Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with your {COMPANY_DOMAIN} email — we'll send you a link, no password needed.
        </p>

        {sent ? (
          <p className="mt-6 rounded-md bg-muted/50 p-3 text-sm">
            Check your inbox at <span className="font-medium">{email}</span> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`you${COMPANY_DOMAIN}`}
              />
            </div>
            <Button type="submit" disabled={sending || !email.trim()}>
              {sending ? "Sending…" : "Send sign-in link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
