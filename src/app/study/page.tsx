import { Suspense } from "react";
import type { Metadata } from "next";
import { ALL_CARDS } from "@/content";
import { StudySession } from "@/components/StudySession";

export const metadata: Metadata = { title: "Drill" };

export default function StudyPage() {
  return (
    <Suspense fallback={<p className="text-sm text-faint">Loading deck…</p>}>
      <StudySession cards={ALL_CARDS} />
    </Suspense>
  );
}
