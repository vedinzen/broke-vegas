import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Tilt_Neon } from "next/font/google";
import "./globals.css";
import "./arena.css";
import "./landing.css";
import "./analysis.css";
import { MarketBridge } from "@/features/market/market-bridge";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const tiltNeon = Tilt_Neon({ variable: "--font-tilt-neon", subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: { default: "BROKE VEGAS — Bet your brains. Not your money.", template: "%s · BROKE VEGAS" },
  description: "A multiplayer trading arena with fictional markets and virtual money only.",
  applicationName: "BROKE VEGAS",
};

export const viewport: Viewport = { themeColor: "#07060b", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${tiltNeon.variable} antialiased`}>
      <body><MarketBridge />{children}</body>
    </html>
  );
}
