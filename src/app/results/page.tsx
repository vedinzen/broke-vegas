import type { Metadata } from "next";
import { MatchResults } from "@/features/results/results";

export const metadata: Metadata = { title: "Match results" };

export default function ResultsPage() {
  return <MatchResults />;
}
