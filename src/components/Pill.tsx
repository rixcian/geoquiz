export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "good" | "bad" | "warn";
}) {
  const tones: Record<string, string> = {
    neutral: "border-line bg-raised text-muted",
    accent: "border-accent/40 bg-accent/10 text-accent",
    good: "border-good/40 bg-good/10 text-good",
    bad: "border-bad/40 bg-bad/10 text-bad",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
