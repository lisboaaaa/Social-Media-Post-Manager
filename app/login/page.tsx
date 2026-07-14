"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AppBackground } from "@/components/layout/AppBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const COMPANY_DOMAIN = "@daredata.engineering";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.82-.07-1.42-.22-2.05H12v3.72h6.6c-.13 1.09-.85 2.74-2.45 3.85l-.02.15 3.56 2.76.25.02c2.26-2.09 3.58-5.16 3.58-8.45" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.79-2.94c-1.02.71-2.38 1.2-4.15 1.2-3.16 0-5.85-2.09-6.8-4.98l-.14.01-3.7 2.87-.05.14C3.28 21.3 7.32 24 12 24" />
      <path fill="#FBBC05" d="M5.2 14.37A7.16 7.16 0 0 1 4.8 12c0-.82.14-1.62.38-2.37l-.01-.16-3.75-2.9-.12.06A11.94 11.94 0 0 0 0 12c0 1.93.47 3.76 1.3 5.37l3.9-3" />
      <path fill="#EA4335" d="M12 4.75c2.26 0 3.79.97 4.66 1.79l3.4-3.3C17.94 1.19 15.24 0 12 0 7.32 0 3.28 2.7 1.3 6.63l3.89 3.02c.96-2.89 3.65-4.9 6.81-4.9" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error(`Couldn't start Google sign-in: ${error.message}`);
      setGoogleLoading(false);
    }
    // On success the browser navigates away to Google immediately — no
    // further local state update needed (and none would survive the redirect).
  };

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
      <AppBackground />
      <div className="w-full max-w-sm rounded-lg border bg-background p-6">
        <h1 className="text-lg font-semibold tracking-tight">Social Media Post Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with your {COMPANY_DOMAIN} account.
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </Button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {sent ? (
          <p className="rounded-md bg-muted/50 p-3 text-sm">
            Check your inbox at <span className="font-medium">{email}</span> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
