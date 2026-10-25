import type { Metadata } from "next";
import { MatchReplay } from "@/features/replay/replay";

export const metadata: Metadata = { title: "Match replay" };

export default function ReplayPage() {
  return <MatchReplay />;
}
