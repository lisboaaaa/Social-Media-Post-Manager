// Shared between the Dev Tools panel (where the template is edited) and
// PostPreviewModal's Share dialog (where it's rendered for a specific post).
export const SHARE_TEMPLATE_STORAGE_KEY = "devtools:shareMessageTemplate";
export const DEFAULT_SHARE_TEMPLATE = 'I need your feedback on the "{title}" post — here\'s the link: {link}';

export function getShareTemplate(): string {
  if (typeof window === "undefined") return DEFAULT_SHARE_TEMPLATE;
  return window.localStorage.getItem(SHARE_TEMPLATE_STORAGE_KEY) || DEFAULT_SHARE_TEMPLATE;
}

export function renderShareTemplate(template: string, vars: { title: string; link: string }): string {
  return template.replaceAll("{title}", vars.title).replaceAll("{link}", vars.link);
}
