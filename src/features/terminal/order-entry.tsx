"use client";

import { useMemo, useState } from "react";
import { ASSETS, type OrderInput, type Side, type Symbol } from "../../../packages/engine/index";
import { useMarketStore } from "@/features/market/store";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function OrderEntry({ symbol }: { symbol: Symbol }) {
  const snapshot = useMarketStore((state) => state.snapshot);
  const busy = useMarketStore((state) => state.busy);
  const submitOrder = useMarketStore((state) => state.submitOrder);
  const [side, setSide] = useState<Side>("buy");
  const [type, setType] = useState<"market" | "limit">("market");
  const [qty, setQty] = useState("10");
  const [price, setPrice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const state = snapshot?.state;
  const player = state?.players.you;
  const asset = state?.assets[symbol];
  const config = ASSETS[symbol];

  const validation = useMemo(() => {
    const quantity = Number(qty);
    const limitPrice = Math.round(Number(price) * 100);
    if (!Number.isSafeInteger(quantity) || quantity < 1) return "Quantity must be a whole number of at least 1.";
    if (type === "limit") {
      if (!Number.isSafeInteger(limitPrice) || limitPrice <= 0) return "Enter a valid limit price.";
      if (limitPrice % config.tickSize !== 0) return `Use ${(config.tickSize / 100).toFixed(2)} rupee price increments.`;
      if (asset && (limitPrice < asset.mid * 0.8 || limitPrice > asset.mid * 1.2)) return "Limit must be within 20% of mid.";
      if (side === "buy" && player && quantity * limitPrice > player.cash) return "Not enough available cash, including existing reservations.";
    }
    if (side === "sell" && player) {
      const position = player.positions[symbol];
      const available = (position?.qty ?? 0) - (position?.reservedQty ?? 0);
      if (quantity > available) return `Only ${available} shares are available to sell.`;
    }
    return null;
  }, [qty, price, type, side, player, symbol, asset, config.tickSize]);

  const review = () => {
    setLocalError(validation);
    if (!validation) setConfirming(true);
  };

  const confirm = async () => {
    if (!state) return;
    const input: OrderInput = {
      playerId: "you", symbol, side, type, qty: Number(qty),
      limitPrice: type === "limit" ? Math.round(Number(price) * 100) : undefined,
      idempotencyKey: crypto.randomUUID(),
    };
    const ok = await submitOrder(input);
    if (ok) {
      setConfirming(false);
      setLocalError(null);
    }
  };

  if (!state || !player || !asset) return <div className="solid-panel p-4 text-muted">The dealer is preparing order entry.</div>;
  const estimatedPrice = type === "market" ? (side === "buy" ? asset.ask : asset.bid) : Math.round(Number(price) * 100);

  return (
    <section className="solid-panel order-entry" aria-labelledby="order-entry-title">
      <div className="panel-heading"><h2 id="order-entry-title">Place your order</h2><span>{symbol}</span></div>
      <div className="order-side" role="group" aria-label="Order side">
        <button className={side === "buy" ? "active-buy" : ""} onClick={() => setSide("buy")} aria-pressed={side === "buy"}>Buy</button>
        <button className={side === "sell" ? "active-sell" : ""} onClick={() => setSide("sell")} aria-pressed={side === "sell"}>Sell</button>
      </div>
      <div className="order-type" role="group" aria-label="Order type">
        <button onClick={() => setType("market")} aria-pressed={type === "market"} className={type === "market" ? "active" : ""}>Market</button>
        <button onClick={() => setType("limit")} aria-pressed={type === "limit"} className={type === "limit" ? "active" : ""}>Limit</button>
      </div>
      <div className="form-stack">
        <div>
          <label className="label" htmlFor="order-qty">Quantity · whole shares</label>
          <Input id="order-qty" inputMode="numeric" type="number" min="1" step="1" value={qty} onChange={(event) => setQty(event.target.value)} aria-describedby="order-validation" />
        </div>
        {type === "limit" && <div>
          <label className="label" htmlFor="order-price">Limit price · ₹ · step {(config.tickSize / 100).toFixed(2)}</label>
          <Input id="order-price" inputMode="decimal" type="number" min="0.05" step={config.tickSize / 100} value={price} onChange={(event) => setPrice(event.target.value)} placeholder={(asset.mid / 100).toFixed(2)} />
        </div>}
      </div>
      <div className="order-estimate number">
        <span>Estimated {side === "buy" ? "cost" : "proceeds"}</span>
        <strong>{estimatedPrice > 0 && Number(qty) > 0 ? formatMoney(estimatedPrice * Number(qty), true) : "—"}</strong>
      </div>
      <p id="order-validation" className="validation" role="alert">{localError ?? validation ?? `Available cash ${formatMoney(player.cash)}`}</p>
      <Button variant={side === "buy" ? "cyan" : "crimson"} className="w-full" onClick={review} disabled={busy || snapshot.phase !== "live"}>
        Review {side} order
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogTitle className="text-xl">Confirm {side} {qty} {symbol}</DialogTitle>
          <DialogDescription className="mt-2 text-muted">This uses virtual money in the local simulation. Executed prices may improve; quantities never exceed your order.</DialogDescription>
          <dl className="confirm-grid number">
            <div><dt>Order</dt><dd>{side.toUpperCase()} · {type.toUpperCase()}</dd></div>
            <div><dt>Asset</dt><dd>{config.name}</dd></div>
            <div><dt>Quantity</dt><dd>{qty}</dd></div>
            <div><dt>{type === "limit" ? "Limit" : "Reference"}</dt><dd>{formatMoney(estimatedPrice, true)}</dd></div>
            <div><dt>Estimate</dt><dd>{formatMoney(estimatedPrice * Number(qty), true)}</dd></div>
          </dl>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>Edit order</Button>
            <Button variant={side === "buy" ? "cyan" : "crimson"} onClick={confirm} disabled={busy}>{busy ? "Sending to dealer…" : `Confirm ${side}`}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
