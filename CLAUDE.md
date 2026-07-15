@AGENTS.md
# Social Media Post Manager — Planning Notes

> Internal tool for the GenOS marketing team to create, review, schedule, and track social media posts.
> This document captures every planning decision made so far, the reasoning behind each, and the questions still open. It is a living spec — update it as decisions get made.

---

## 1. What this tool IS (and is NOT)

- It is an **internal tracking tool** for the marketing team. Everyone on the team uses one shared board.
- It does **NOT** publish anything to LinkedIn, Instagram, or X. There is no connection to any platform's API.
- **"Scheduled" and "Published" are status labels only.** A human still copy-pastes the content into each platform manually. This keeps the project small and buildable.

---

## 2. What a "post" is (the core data model)

A post = **one media file (image) + a text description + one platform.**

- Platforms: **LinkedIn, Instagram, or X.**
- Character limits shown per platform:
  - LinkedIn: **3000**
  - Instagram: **2200**
  - X: **280**
- Normally **one platform per post.** (See Open Question #1 — whether one post can target multiple platforms is still undecided.)

### Fields a post carries (confirmed so far)
- Platform (one of LinkedIn / Instagram / X)
- Text description
- Image (one — see Open Question about multiple images)
- Status (workflow stage — see section 4)
- Assignee (who is working on it)
- Target date (optional but encouraged — see section 5)
- Categories / tags (multiple allowed — see section 6)

*(The full field list is not finalized — see Open Question #6.)*

---

## 3. Access & login

- **One shared board.** Every marketing team member sees the same posts and has **identical permissions** — everyone can edit everything. No per-person permission walls (they'd just add friction on an internal tool).
- **Login recommendation: Google sign-in restricted to the company email domain** (built into Supabase).
  - Reasoning: the app is deployed on a public Vercel URL, so *some* door is required — the choice is only *which* door, not whether to have one.
  - Google sign-in is lower-effort than a shared password (mostly configuration, no login page to build, nothing to leak or rotate), and it's one click for the team since they're already logged into their work Google account.
  - Bonus: every action is tied to a real person, so "who moved this to Approved?" is answerable — which matters once several people edit the same board.
- **Status: recommended, pending final confirmation** from the project owner.

---

## 4. Workflow / board stages

The project brief suggested: `Draft → Review → Approved → Scheduled → Published`.
The team's *actual* ClickUp flow is: `Backlog → To Do → Writing → Designing → In Review → Changes Requested`.
The brief is a **starting suggestion, not a strict spec** — so we're building a **merged** workflow that fits how the team really works while adding the useful scheduling/publishing tail from the brief.

### Proposed merged stages
`Backlog → Writing → Designing → In Review → Approved → Scheduled → Published`

Reasoning behind the merge:
- **Writing and Designing kept separate** — the team deliberately splits copy work from image work, because they often move at different speeds / different people. (Could be merged later if it turns out one person always does both.)
- **"To Do" folded into "Backlog"** — both mean "not started." One bucket is cleaner. *(See Open Question #3.)*
- **Approved / Scheduled / Published added** from the brief — these are the useful end-of-pipeline states the current ClickUp doesn't model well, and they're what make the calendar useful.
- **"Changes Requested" handling is undecided** — column vs. flag. *(See Open Question #4.)*

---

## 5. Dates & the two views

- Every post can have a **target date, set at creation** (early), so the team knows *when they need to work* on it — matching how they plan in ClickUp today.
- Date is **optional but strongly encouraged.** A post with no date yet is allowed (an "idea, no date").
- **Safety net:** if a post is dragged to **Scheduled** without a date, the app **forces the user to pick one** right then.

### Two views over ONE set of posts
The same posts are shown two ways (not two databases — one set of posts, two lenses):
1. **Board view (Kanban)** — good for "what's stuck in review?" Drag posts between status columns.
2. **Calendar view (month)** — good for "what's going out next week?" Click a day to see the posts on it, with assignee and status. This matches how the team lives in ClickUp today (they're calendar-native).
- The calendar shows any post **that has a date, at any status.**

---

## 6. Categories / tags

- Each post can have **multiple categories at once** (e.g. "Internal" + "Meet the Team" together).
- Example categories: **Meet the Team, Internal, GenOS** (more to be defined with the team).
- Categories will become **filters** on both the board and calendar.

---

## 7. Image preview

- **Decision reversed (2026-07-15):** the preview should now be as faithful as practical to each platform's real caption-truncation behavior, so it doesn't mislead the person writing the post. The earlier "simple, rough preview" call (below) is superseded.
- Implementation approximates truncation by **character count**, not CSS line-clamp, since visual line count depends on container width/font rendering: LinkedIn mobile ~210 chars before "…see more", Instagram mobile ~125 chars before "… more", X shown in full (280-char cap already fits without clipping). Desktop views show the caption in full, matching each platform's expanded/desktop behavior.
- These cutoffs are a best-effort approximation, not verified live against the platforms — they will drift as LinkedIn/Instagram/X tweak their UI. Re-check the numbers in `components/posts/mockups/captionPreview.ts` against the real apps periodically.
- ~~The team wants a simple, rough preview — image + text shown together so it "looks roughly right." NOT a faithful per-platform mockup with exact caption-truncation rules. (Faithful truncation is more work, the rules drift as platforms change, and the team confirmed they don't need it.)~~ *(superseded above)*

---

## 8. Filtering

- Filter posts by **platform** and **date** (from the brief).
- Plus filter by **category** (added).

---

## 9. Tech stack (from the brief)

- **Framework:** Next.js (TypeScript) — same stack as the GenOS website, so patterns can be copied directly.
- **UI components:** shadcn/ui (pre-built components).
- **Database:** Supabase (hosted Postgres + JavaScript client). Also provides the Google auth.
- **Deploy:** Vercel, connected to a GitHub repo (auto-deploys).
- **Drag-and-drop:** @hello-pangea/dnd (for the Kanban board).

---

## OPEN QUESTIONS (still to decide)

1. **One platform per post, or can one post target multiple platforms?** (Owner said "normally one, but I'll confirm.") This affects how character limits and the preview behave.
2. **Final confirmation on Google login** vs. an alternative front door.
3. **Is "To Do" meaningfully different from "Backlog"**, or is one "not started" bucket enough?
4. **"Changes Requested": dedicated column, or a flag/badge on the card** that moves it back to Writing/Designing? (Recommendation leans toward the flag — cleaner, puts the post where the work is — but a column is more familiar to the team.)
5. **Can a post have more than one image**, or exactly one? (Assumed one so far; not confirmed.)
6. **The full post field list.** Still to confirm whether posts also need: a link to the published post, notes/comments between team members, and a "who requested this" separate from "who's building it."

---

## Decisions log (quick reference)

| Topic | Decision |
|---|---|
| Auto-publish? | No — status labels only |
| Post = | 1 image + text + 1 platform |
| Char limits | LinkedIn 3000 / Instagram 2200 / X 280 |
| Permissions | Everyone equal, shared board |
| Login | Google (company domain) — recommended, pending final OK |
| Preview | Simple: image + text roughly together |
| Date | Optional at creation, forced when dragged to Scheduled |
| Views | Board + Calendar over one set of posts |
| Categories | Multiple per post; become filters |
| Stages | Backlog → Writing → Designing → In Review → Approved → Scheduled → Published (merged, provisional) |
| Stack | Next.js/TS, shadcn/ui, Supabase, Vercel, @hello-pangea/dnd |