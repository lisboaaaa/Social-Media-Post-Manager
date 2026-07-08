// Decorative background layer shared by every top-level page: a soft gradient
// plus two blurred color blobs (the app's own LinkedIn/Instagram accent
// colors). Fixed to the viewport rather than absolutely positioned inside the
// page, so the blobs stay pinned near the visual corners on short pages
// (login, suggest) and tall, scrollable ones (the board) alike.
export function AppBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-muted/60 via-background to-background"
    >
      <div
        className="absolute -left-32 -top-32 size-96 rounded-full blur-3xl"
        style={{ backgroundColor: "#0A66C2", opacity: 0.12 }}
      />
      <div
        className="absolute -bottom-32 -right-24 size-[28rem] rounded-full blur-3xl"
        style={{ backgroundColor: "#C2185B", opacity: 0.1 }}
      />
    </div>
  );
}
