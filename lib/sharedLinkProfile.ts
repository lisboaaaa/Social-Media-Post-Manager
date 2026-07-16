// The pseudo-profile edits made through a public, no-login post link
// (app/p/[id]) are attributed to in post_history — there's no real session to
// identify who it was. Matches the id inserted by
// supabase/shared-link-profile.sql.
export const SHARED_LINK_PROFILE_ID = "99999999-9999-9999-9999-999999999999";
