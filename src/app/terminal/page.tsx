import type { Metadata } from "next";
import { TradingTerminal } from "@/features/terminal/terminal";

export const metadata: Metadata = { title: "Trading floor" };

export default function TerminalPage() {
  return <TradingTerminal />;
}
