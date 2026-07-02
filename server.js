/* ===================================================================
   DisinfeX — zero-dependency static server + Telegram lead proxy.
   Requires Node.js >= 18 (built-in fetch). No npm install needed.

   Env (.env or real environment):
     TELEGRAM_BOT_TOKEN   Telegram bot token from @BotFather
     TELEGRAM_CHAT_ID     Chat / group / channel id to receive leads
     PORT                 (optional) default 3000
   =================================================================== */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

/* ---- Minimal .env loader (no dependency) ---- */
(function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
})();

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const PUBLIC_DIR = path.join(__dirname, "public");

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn(
    "[WARN] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — leads will fail. Copy .env.example to .env and fill them in.",
  );
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

/* ---- Simple per-IP rate limit (anti-spam) ---- */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const win = 60_000,
    max = 8;
  const rec = hits.get(ip) || { c: 0, t: now };
  if (now - rec.t > win) {
    rec.c = 0;
    rec.t = now;
  }
  rec.c++;
  hits.set(ip, rec);
  return rec.c > max;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildMessage(d) {
  const lines = [
    "🐞 <b>Новая заявка — DisinfeX</b>",
    "",
    `📌 <b>Форма:</b> ${esc(d.source)}`,
    d.name ? `👤 <b>Имя:</b> ${esc(d.name)}` : "",
    `📞 <b>Телефон:</b> ${esc(d.phone)}`,
    d.service ? `🎯 <b>Услуга:</b> ${esc(d.service)}` : "",
    d.object ? `🏠 <b>Объект:</b> ${esc(d.object)}` : "",
    d.comment ? `💬 <b>Комментарий:</b> ${esc(d.comment)}` : "",
    "",
    `🌐 <b>Язык:</b> ${esc(d.lang)}`,
    `🕒 ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
  ];
  return lines.filter(Boolean).join("\n");
}

async function sendToTelegram(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram ${res.status}: ${body}`);
  }
}

/* ---- Static file serving ---- */
function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0] || "/");
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>404</h1>");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
    // Fingerprint-free assets: cache long. HTML/SEO files: keep fresh.
    const fresh = [".html", ".xml", ".txt", ".webmanifest", ".json"];
    headers["Cache-Control"] = fresh.includes(ext)
      ? "public, max-age=3600"
      : "public, max-age=31536000, immutable";
    res.writeHead(200, headers);
    res.end(data);
  });
}

/* ---- Server ---- */
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/lead") {
    const ip = (
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "?"
    )
      .split(",")[0]
      .trim();

    if (rateLimited(ip)) {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "rate_limited" }));
      return;
    }

    let body = "";
    let tooBig = false;
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8_000) {
        tooBig = true;
        req.destroy();
      }
    });
    req.on("end", async () => {
      if (tooBig) return;
      try {
        const d = JSON.parse(body || "{}");
        const phoneDigits = String(d.phone || "").replace(/\D/g, "");
        if (!/^998\d{9}$/.test(phoneDigits)) throw new Error("invalid phone");
        if (d.website) throw new Error("honeypot"); // reserved anti-bot field

        await sendToTelegram(buildMessage(d));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error("[lead error]", err.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "send_failed" }));
      }
    });
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405).end("Method Not Allowed");
});

server.listen(PORT, () => {
  console.log(`\n  DisinfeX running →  http://localhost:${PORT}\n`);
});
