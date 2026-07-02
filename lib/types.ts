export type Platform = "linkedin" | "instagram" | "x";

export const PLATFORMS: Platform[] = ["linkedin", "instagram", "x"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  x: "X",
};

export const PLATFORM_LIMITS: Record<Platform, number> = {
  linkedin: 3000,
  instagram: 2200,
  x: 280,
};

export type PostStatus =
  | "backlog"
  | "writing"
  | "designing"
  | "in_review"
  | "approved"
  | "scheduled"
  | "published";

export const POST_STATUSES: { value: PostStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "writing", label: "Writing" },
  { value: "designing", label: "Designing" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
];

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  initials: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface PostImage {
  id: string;
  postId: string;
  imageUrl: string;
  position: number;
}

export interface Comment {
  id: string;
  postId: string | null; // null = general team comment, not tied to a post
  authorId: string;
  body: string;
  createdAt: string; // ISO datetime
}

export interface Post {
  id: string;
  platform: Platform;
  title: string; // short internal label, just for scanning the tracker — never posted, no character limit
  description: string; // the actual post copy — this is what gets published, character-limited per platform
  status: PostStatus;
  targetDate: string | null; // ISO date (yyyy-mm-dd)
  needsChanges: boolean;
  publishedUrl: string | null;
  assigneeId: string | null;
  requestedById: string | null;
  createdBy: string;
  categoryIds: string[];
  images: PostImage[];
  createdAt: string;
  updatedAt: string;
}
