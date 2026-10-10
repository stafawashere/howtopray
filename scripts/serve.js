import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { OUT } from "./build.js";

const PORT = Number(process.env.PORT) || 8000;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png"
};

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const file = path.join(OUT, path.normalize(decoded));
  const isInsideSite = file.startsWith(OUT);

  if (!isInsideSite) return null;

  const isDirectory = fs.existsSync(file) && fs.statSync(file).isDirectory();

  return isDirectory ? path.join(file, "index.html") : file;
}

const server = http.createServer((request, response) => {
  const file = resolveFile(request.url);

  if (!file || !fs.existsSync(file)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const contentType = CONTENT_TYPES[path.extname(file)] || "application/octet-stream";

  response.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(file).pipe(response);
});

server.listen(PORT, () => {
  console.log(`Serving _site at http://localhost:${PORT}`);
});
