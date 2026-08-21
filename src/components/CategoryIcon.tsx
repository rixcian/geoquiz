import type { CategoryId } from "@/lib/types";

/**
 * Line icons drawn per category. Replaces the Unicode glyphs the first pass
 * used -- several of those fell back to tofu depending on the platform's
 * fonts, and a drawn mark reads better at 20px anyway.
 */
export function CategoryIcon({ id, className }: { id: CategoryId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className ?? "h-5 w-5"}
    >
      {paths(id)}
    </svg>
  );
}

function paths(id: CategoryId) {
  switch (id) {
    case "bollards":
      return (
        <>
          <path d="M10 3.5h4l1.2 15.5h-6.4z" />
          <path d="M9.3 8h5.4" />
          <path d="M4 19.5h16" />
        </>
      );
    case "utility-poles":
      return (
        <>
          <path d="M12 4.5v16" />
          <path d="M6 8h12" />
          <path d="M8 12.5h8" />
          <path d="M7 6.5v1.5M17 6.5v1.5" />
          <path d="M4 20.5h16" />
        </>
      );
    case "road-lines":
      return (
        <>
          <path d="M5 21 8 3" />
          <path d="M19 21 16 3" />
          <path d="M12 4v3" />
          <path d="M12 10.5v3" />
          <path d="M12 17v3" />
        </>
      );
    case "license-plates":
      return (
        <>
          <rect x="2.5" y="6.5" width="19" height="11" rx="2.5" />
          <path d="M7 6.5v11" />
          <path d="M11 11h7" />
          <path d="M11 14h4" />
        </>
      );
    case "road-signs":
      return (
        <>
          <path d="M12 3.2 21 17H3z" />
          <path d="M12 8.5v3.5" />
          <path d="M12 14.6h.01" />
          <path d="M12 17v4" />
        </>
      );
    case "scripts":
      return (
        <>
          <path d="M4 19 9.5 5l5.5 14" />
          <path d="M6 14.5h7" />
          <path d="M17.5 9v10" />
          <path d="M15 9h5" />
        </>
      );
    case "google-car":
      return (
        <>
          <path d="M3 18h18" />
          <path d="M4.5 18v-3.2L7 11h10l2.5 3.8V18" />
          <path d="M8.5 11V9.5" />
          <circle cx="7.5" cy="18" r="1.6" />
          <circle cx="16.5" cy="18" r="1.6" />
          <circle cx="8.5" cy="6" r="2.2" />
        </>
      );
    case "landscape":
      return (
        <>
          <circle cx="17" cy="7" r="2.6" />
          <path d="M2.5 18.5 8 9.5l4.2 6.6" />
          <path d="M10.5 18.5 14.5 12l7 6.5" />
          <path d="M2 21h20" />
        </>
      );
  }
}
