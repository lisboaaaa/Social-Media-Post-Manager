"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { mentionToken } from "@/lib/mentions";

const MENTION_PATTERN = /(?:^|\s)@(\w*)$/;

export function CommentForm({
  onSubmit,
  placeholder = "Write a comment…",
  showButton = true,
  replyingTo = null,
}: {
  onSubmit: (body: string) => void;
  placeholder?: string;
  showButton?: boolean;
  replyingTo?: { label: string; onCancel: () => void } | null;
}) {
  const { profiles } = useStore();
  const [body, setBody] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setBody("");
    setMentionQuery(null);
  };

  const detectMention = (value: string, cursorPos: number) => {
    const match = value.slice(0, cursorPos).match(MENTION_PATTERN);
    setMentionQuery(match ? match[1] : null);
  };

  const mentionMatches =
    mentionQuery !== null
      ? profiles.filter((p) => p.fullName.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
      : [];

  const insertMention = (fullName: string) => {
    const el = textareaRef.current;
    const cursorPos = el?.selectionStart ?? body.length;
    const uptoCursor = body.slice(0, cursorPos);
    const match = uptoCursor.match(MENTION_PATTERN);
    if (!match) return;

    const atIndex = uptoCursor.lastIndexOf("@");
    const insertion = `@${mentionToken(fullName)} `;
    const nextValue = body.slice(0, atIndex) + insertion + body.slice(cursorPos);
    setBody(nextValue);
    setMentionQuery(null);

    requestAnimationFrame(() => {
      const nextCursor = atIndex + insertion.length;
      el?.focus();
      el?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {replyingTo && (
        <div className="flex items-center justify-between rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
          <span>
            Replying to <span className="font-medium text-foreground">{replyingTo.label}</span>
          </span>
          <button
            type="button"
            onClick={replyingTo.onCancel}
            aria-label="Cancel reply"
            className="rounded hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
          }}
          placeholder={placeholder}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Escape" && mentionQuery !== null) {
              setMentionQuery(null);
              return;
            }

            if (e.key !== "Enter") return;

            if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
              e.preventDefault();
              if (mentionMatches.length > 0) {
                insertMention(mentionMatches[0].fullName);
              } else {
                submit();
              }
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
        {mentionMatches.length > 0 && (
          <div className="absolute inset-x-0 top-full z-10 mt-1 flex flex-col gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
            {mentionMatches.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => insertMention(profile.fullName)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px]">{profile.initials}</AvatarFallback>
                </Avatar>
                {profile.fullName}
              </button>
            ))}
          </div>
        )}
      </div>

      {showButton && (
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={submit} disabled={!body.trim()}>
            Comment
          </Button>
        </div>
      )}
    </div>
  );
}
