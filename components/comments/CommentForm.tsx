"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({
  onSubmit,
  placeholder = "Write a comment…",
}: {
  onSubmit: (body: string) => void;
  placeholder?: string;
}) {
  const [body, setBody] = useState("");

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setBody("");
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={2}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;

          if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            submit();
            return;
          }

          if (e.metaKey || e.ctrlKey) {
            // Ctrl/Cmd+Enter doesn't insert a newline in a plain <textarea> by
            // default (unlike Enter or Shift+Enter) — insert it ourselves.
            // execCommand handles the cursor position natively and fires the
            // usual input event, so React's onChange picks it up correctly.
            e.preventDefault();
            document.execCommand("insertText", false, "\n");
          }
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Enter to send, Ctrl+Enter for a new line</span>
        <Button size="sm" onClick={submit} disabled={!body.trim()}>
          Comment
        </Button>
      </div>
    </div>
  );
}
