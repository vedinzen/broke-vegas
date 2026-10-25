"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, KeyRound, Plus, Users } from "lucide-react";
import { useMarketStore } from "@/features/market/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeBadge } from "@/components/mode-badge";

export function CasinoLobby() {
  const router = useRouter();
  const snapshot = useMarketStore((state) => state.snapshot);
  const busy = useMarketStore((state) => state.busy);
  const error = useMarketStore((state) => state.error);
  const createRoom = useMarketStore((state) => state.createRoom);
  const joinRoom = useMarketStore((state) => state.joinRoom);
  const setReady = useMarketStore((state) => state.setReady);
  const startMatch = useMarketStore((state) => state.startMatch);
  const [playerName, setPlayerName] = useState("You");
  const [roomName, setRoomName] = useState("The Obsidian Table");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const inRoom = snapshot?.phase === "lobby" || snapshot?.phase === "live";

  const create = async () => {
    if (!playerName.trim() || !roomName.trim()) { setFormError("Enter your display name and a room name."); return; }
    setFormError(null);
    await createRoom(playerName.trim(), roomName.trim());
  };
  const join = async () => {
    if (!/^[A-Z0-9]{6}$/i.test(code)) { setFormError("Room codes contain exactly 6 letters or digits."); return; }
    if (!playerName.trim()) { setFormError("Enter your display name."); return; }
    setFormError(null);
    await joinRoom(playerName.trim(), code.toUpperCase());
  };
  const start = async () => {
    if (await startMatch()) router.push("/terminal");
  };

  return (
    <main className="lobby-page">
      <nav className="lobby-nav glass"><Link href="/" className="display-face neon-wordmark text-2xl">BROKE VEGAS</Link><ModeBadge /></nav>
      <section className="lobby-intro">
        <p className="display-face text-gold text-lg">YOUR FRIENDS ARE THE HOUSE</p>
        <h1>Pick a table.<br />Keep your dignity.</h1>
        <p>Three seats. One shared market. ₹1,00,000 in virtual cash each. The two bots trade the same engine and order book you do.</p>
      </section>
      {!inRoom ? (
        <div className="lobby-setup">
          <section className="glass room-panel">
            <div className="room-panel-heading"><Plus size={20} /><div><h2>Create a private room</h2><p>You are the host and control the market.</p></div></div>
            <label className="label" htmlFor="create-name">Display name</label>
            <Input id="create-name" value={playerName} maxLength={24} onChange={(event) => setPlayerName(event.target.value)} />
            <label className="label mt-4" htmlFor="room-name">Room name</label>
            <Input id="room-name" value={roomName} maxLength={32} onChange={(event) => setRoomName(event.target.value)} />
            <Button className="mt-5 w-full" onClick={create} disabled={busy}>Create table <ArrowRight size={16} /></Button>
          </section>
          <section className="glass room-panel">
            <div className="room-panel-heading"><KeyRound size={20} /><div><h2>Join by code</h2><p>Any six-character code opens a local demo table.</p></div></div>
            <label className="label" htmlFor="join-name">Display name</label>
            <Input id="join-name" value={playerName} maxLength={24} onChange={(event) => setPlayerName(event.target.value)} />
            <label className="label mt-4" htmlFor="room-code">Six-character room code</label>
            <Input id="room-code" value={code} maxLength={6} placeholder="NEON42" autoCapitalize="characters" onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
            <Button variant="cyan" className="mt-5 w-full" onClick={join} disabled={busy}>Join table <ArrowRight size={16} /></Button>
          </section>
          <section className="room-empty">
            <Users size={24} /><h2>No public rooms on this floor.</h2><p>Local simulation only exposes the room you create or join. There are no invented player counts.</p>
          </section>
        </div>
      ) : (
        <section className="room-inside glass">
          <div className="room-title"><div><span>Private table · {snapshot.roomCode}</span><h2>{roomName || "The Obsidian Table"}</h2></div><div className="room-code"><span>Room code</span><strong className="number">{snapshot.roomCode}</strong></div></div>
          <div className="poker-table">
            <div className="table-felt"><span className="display-face">BROKE VEGAS</span><small>PLACE YOUR BETS. PLACE YOUR ORDERS.</small></div>
            {Object.values(snapshot.state.players).map((player, index) => {
              const ready = snapshot.ready[player.id];
              return <div className={`seat seat-${index} ${ready ? "ready" : ""}`} key={player.id}><div className="seat-marker">{ready ? <Check size={20} /> : player.name.slice(0, 1)}</div><strong>{player.name}</strong><span>{player.isBot ? "Engine bot" : "Host"} · {ready ? "Ready" : "Not ready"}</span></div>;
            })}
          </div>
          <div className="room-controls">
            <Button variant={snapshot.ready.you ? "ghost" : "cyan"} onClick={() => setReady(!snapshot.ready.you)} disabled={busy}>{snapshot.ready.you ? "Clear ready" : "Ready up"}</Button>
            <Button onClick={start} disabled={busy || !snapshot.ready.you}>Open the market <ArrowRight size={16} /></Button>
            {snapshot.phase === "live" && <Button variant="ghost" onClick={() => router.push("/terminal")}>Return to terminal</Button>}
          </div>
        </section>
      )}
      {(formError || error) && <p className="lobby-error" role="alert">{formError ?? error}</p>}
      <footer className="lobby-footer">Virtual money only. No real tickers, markets, casinos, or predictions.</footer>
    </main>
  );
}
