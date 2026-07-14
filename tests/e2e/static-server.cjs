"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const PORT = Number(process.env.PORT || 4173);
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const absolute = path.resolve(PROJECT_ROOT, relative);
  if (absolute !== PROJECT_ROOT && !absolute.startsWith(`${PROJECT_ROOT}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  fs.stat(absolute, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", MIME_TYPES[path.extname(absolute).toLowerCase()] || "application/octet-stream");
    fs.createReadStream(absolute).pipe(response);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`FUTURE_NOIR_TEST_SERVER=http://127.0.0.1:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
