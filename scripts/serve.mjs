import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const allowed = new Map([
  ["index.html", "text/html"], ["styles.css", "text/css"], ["app.js", "text/javascript"],
  ["core.js", "text/javascript"], ["config.js", "text/javascript"], ["prompts.json", "application/json"],
  ["favicon.svg", "image/svg+xml"]
]);
const port = Number(process.env.PORT || 4173);
http.createServer(async (request, response) => {
  try {
    let path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    // Also exercise the repository-subpath deployment locally.
    path = path.replace(/^\/ai-prompt-catalogue(?=\/)/, "");
    const name = path === "/" ? "index.html" : path.slice(1);
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405).end(); return; }
    if (!allowed.has(name)) { response.writeHead(404).end("Not found"); return; }
    const body = await readFile(new URL(name, root));
    response.writeHead(200, { "Content-Type": `${allowed.get(name)}; charset=utf-8`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch { response.writeHead(500).end("Unable to serve the requested file."); }
}).listen(port, "127.0.0.1", () => {
  console.log(`Prompt Library: http://127.0.0.1:${port}`);
  console.log(`Serving ${fileURLToPath(root)} — press Ctrl+C to stop.`);
});
