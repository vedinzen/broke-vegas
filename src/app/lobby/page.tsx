import type { Metadata } from "next";
import { CasinoLobby } from "@/features/lobby/lobby";

export const metadata: Metadata = { title: "Casino lobby" };

export default function LobbyPage() {
  return <CasinoLobby />;
}
