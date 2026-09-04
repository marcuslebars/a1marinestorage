import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleQuoteSubmission } from "./server/quote-handler";
import { handleContactSubmission } from "./server/contact-handler";
import { handleQuotePdf, QuotePdfError } from "./server/quote-pdf-handler";
import { handleQuoteResume } from "./server/quote-resume-handler";
import { handlePartialQuoteLead } from "./server/partial-lead-handler";
import {
  resolveTransportBand,
  TransportBandError,
} from "./server/transport-band";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map(entry => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

function vitePluginStorageProxy(): Plugin {
  return {
    name: "manus-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/manus-storage", async (req, res) => {
        const key = req.url?.replace(/^\//, "");
        if (!key) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing storage key");
          return;
        }

        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(
          /\/+$/,
          ""
        );
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (!forgeBaseUrl || !forgeKey) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Storage proxy not configured");
          return;
        }

        try {
          const forgeUrl = new URL(
            "v1/storage/presign/get",
            forgeBaseUrl + "/"
          );
          forgeUrl.searchParams.set("path", key);

          const forgeResp = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` },
          });

          if (!forgeResp.ok) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }

          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }

          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    },
  };
}

// Serves the quote + contact submission endpoints in dev, sharing the production handlers.
function vitePluginLeadApi(): Plugin {
  const jsonPost =
    (handler: (body: unknown) => Promise<{ status: number; body: unknown }>) =>
    (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      if (req.method !== "POST") return next();
      let body = "";
      req.on("data", chunk => {
        body += chunk.toString();
      });
      req.on("end", async () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const { status, body: out } = await handler(parsed);
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(out));
        } catch {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              error: "We couldn't record your request. Please try again.",
            })
          );
        }
      });
    };
  return {
    name: "a1-lead-api",
    configureServer(server: ViteDevServer) {
      // ORDER MATTERS. connect matches middleware by PREFIX, so "/api/quote"
      // also matches "/api/quote/pdf" — and the submission handler ignores the
      // URL, so in dev a PDF request was being handled as a quote submission.
      // The more specific paths must be registered first.
      // Resume, first and by itself. It is a GET, and `jsonPost` calls next()
      // for anything that is not a POST — so without its own route this request
      // would fall past every handler here and be answered by the SPA fallback
      // with index.html, which is exactly the "link goes nowhere" failure this
      // phase exists to fix. Dev would have looked fine and been broken.
      server.middlewares.use("/api/quote/resume", (req, res, next) => {
        if (req.method !== "GET") return next();
        const q = new URL(req.url ?? "", "http://localhost").searchParams.get(
          "q"
        );
        const { status, body } = handleQuoteResume(q);
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json");
        // See the note on the Express route: 410 is cacheable by default.
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(body));
      });
      server.middlewares.use(
        "/api/transport/band",
        jsonPost(async body => {
          const place =
            body &&
            typeof body === "object" &&
            typeof (body as { place?: unknown }).place === "string"
              ? (body as { place: string }).place
              : "";
          try {
            return {
              status: 200,
              body: { ok: true, ...(await resolveTransportBand(place)) },
            };
          } catch (err) {
            if (err instanceof TransportBandError) {
              const status =
                err.code === "invalid_place"
                  ? 400
                  : err.code === "not_found"
                    ? 404
                    : 503;
              return {
                status,
                body: { ok: false, code: err.code, error: err.message },
              };
            }
            throw err;
          }
        })
      );
      // The PDF replies with BINARY plus headers, so it cannot go through
      // jsonPost. Without its own route it fell through to the submission
      // handler above and dev could never exercise a download at all.
      server.middlewares.use("/api/quote/pdf", (req, res, next) => {
        if (req.method !== "POST") return next();
        let raw = "";
        req.on("data", c => {
          raw += c.toString();
        });
        req.on("end", async () => {
          try {
            const body = raw ? JSON.parse(raw) : {};
            const result = await handleQuotePdf({
              selection: body.selection,
              boat: body.boat,
              email: typeof body.email === "string" ? body.email : undefined,
              origin: `http://${req.headers.host ?? "localhost:5173"}`,
            });
            // Parity with the Express route: a volunteered email is a lead.
            // Without this, dev could never exercise the capture path that
            // Phase 1 exists to fix.
            if (result.email) {
              void handlePartialQuoteLead({
                email: result.email,
                selection: body.selection,
                boat: body.boat,
                quoteRef: result.reference,
                pdf: result.pdf,
                resumeUrl: result.resumeUrl,
              });
            }

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
              "Content-Disposition",
              `attachment; filename="${result.filename}"`
            );
            res.setHeader("X-Quote-Reference", result.reference);
            res.end(result.pdf);
          } catch (err) {
            const known = err instanceof QuotePdfError;
            res.statusCode =
              known && err.code === "invalid_selection" ? 400 : 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: false,
                error: known
                  ? err.message
                  : "We couldn't build your quote PDF. Please try again.",
              })
            );
          }
        });
      });
      server.middlewares.use("/api/quote", jsonPost(handleQuoteSubmission));
      server.middlewares.use("/api/contact", jsonPost(handleContactSubmission));
    },
  };
}

// Dev parity with the production Express server: 301 /terms to the canonical
// A1 Marine terms so `pnpm dev` behaves like prod (no dead page, no SPA bounce).
function vitePluginTermsRedirect(): Plugin {
  return {
    name: "a1-terms-redirect",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        "/terms",
        (_req: IncomingMessage, res: ServerResponse) => {
          res.statusCode = 301;
          res.setHeader("Location", "https://a1marine.ca/terms");
          res.end();
        }
      );
    },
  };
}

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime(),
  vitePluginManusDebugCollector(),
  vitePluginStorageProxy(),
  vitePluginLeadApi(),
  vitePluginTermsRedirect(),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
