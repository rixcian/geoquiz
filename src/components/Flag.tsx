/** Renders an ISO alpha-2 code as a flag emoji via regional indicator symbols. */
export function Flag({ code, className }: { code?: string; className?: string }) {
  if (!code || code.length !== 2) return null;
  const upper = code.toUpperCase();
  const emoji = String.fromCodePoint(
    ...[...upper].map((ch) => 0x1f1e6 + (ch.charCodeAt(0) - 65)),
  );
  return (
    <span aria-hidden className={className}>
      {emoji}
    </span>
  );
}
