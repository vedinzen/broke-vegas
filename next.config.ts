import path from "node:path";
import type { NextConfig } from "next";

const isExport = process.env.EXPORT === "1";

const securityHeaders = [
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: isExport ? "/broke-vegas" : "" },
  cacheComponents: !isExport,
  partialPrefetching: !isExport,
  turbopack: {
    root: path.resolve(process.cwd()),
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
  ...(isExport
    ? { distDir: ".next-export", output: "export" as const, basePath: "/broke-vegas", trailingSlash: true, images: { unoptimized: true } }
    : {
        async headers() {
          return [{ source: "/(.*)", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
