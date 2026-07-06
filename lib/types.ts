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

// Max photos each platform accepts in a single post. Images are shared across
// every platform on a post, so the tightest of the selected platforms' limits
// is just a heads-up — it isn't enforced at upload time (see ImageUploader).
export const PLATFORM_IMAGE_LIMITS: Record<Platform, number> = {
  instagram: 20,
  linkedin: 9,
  x: 4,
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
  lastReadTeamNotesAt: string | null;
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
  mediaType: "image" | "video";
}

export interface Comment {
  id: string;
  postId: string | null; // null = general team comment, not tied to a post
  authorId: string;
  body: string;
  parentId: string | null; // the comment this one is replying to, if any
  createdAt: string; // ISO datetime
}

export interface CommentReaction {
  id: string;
  commentId: string;
  authorId: string;
  emoji: string;
  createdAt: string; // ISO datetime
}

export interface Post {
  id: string;
  platforms: Platform[];
  title: string; // short internal label, just for scanning the tracker — never posted, no character limit
  descriptions: Record<Platform, string>; // the actual post copy per platform — character-limited per platform
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
