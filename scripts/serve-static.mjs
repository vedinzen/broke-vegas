/**
 * Minimal static file server for verifying the GitHub Pages export locally.
 * Node's http server handles Chrome's parallel connections; python's
 * http.server intermittently refused them and stalled hydration.
 *
 *   node scripts/serve-static.mjs .next-export 4319
 *
 * Serves the directory as-is, so a Pages sub-path is reproduced by passing a
 * parent directory that contains a `<repo>/` folder.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.argv[2] ?? ".next-export";
const port = Number(process.argv[3] ?? 4319);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  let file = normalize(join(root, pathname));

  if (!file.startsWith(normalize(root))) {
    response.writeHead(403).end("forbidden");
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;

  if (!existsSync(file)) {
    response.writeHead(404, { "content-type": "text/plain" }).end("not found");
    return;
  }

  const type = types[extname(file)] ?? "application/octet-stream";
  response.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`serving ${root} at http://127.0.0.1:${port}`);
});
