import type { Metadata } from "next";
import { ALL_CARDS } from "@/content";
import { BrowseLibrary } from "@/components/BrowseLibrary";

export const metadata: Metadata = {
  title: "Browse",
  description: "Read every meta side by side, grouped by category or by region.",
};

export default function BrowsePage() {
  return <BrowseLibrary cards={ALL_CARDS} />;
}
