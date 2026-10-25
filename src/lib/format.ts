export const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const inrPrecise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const integer = new Intl.NumberFormat("en-IN");

export function formatMoney(paise: number, precise = false): string {
  return (precise ? inrPrecise : inr).format(paise / 100);
}

export function formatSignedMoney(paise: number): string {
  return `${paise > 0 ? "+" : paise < 0 ? "−" : ""}${formatMoney(Math.abs(paise))}`;
}

export function formatPercent(value: number): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(2)}%`;
}

export function formatTimer(ticksRemaining: number): string {
  const minutes = Math.floor(Math.max(0, ticksRemaining) / 60);
  const seconds = Math.max(0, ticksRemaining) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
