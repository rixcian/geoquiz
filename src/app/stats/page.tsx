import type { Metadata } from "next";
import { ALL_CARDS } from "@/content";
import { StatsDashboard } from "@/components/StatsDashboard";

export const metadata: Metadata = {
  title: "Stats",
  description: "Accuracy by category and region, box distribution, review history and day streak.",
};

export default function StatsPage() {
  return <StatsDashboard cards={ALL_CARDS} />;
}
