import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { handleQuoteSubmission } from "./quote-handler";
import { handleContactSubmission } from "./contact-handler";
import fs from "fs";
import { getPageMeta, hasPage, injectMeta, renderSitemap } from "../shared/seo";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.json({ limit: "1mb" }));

  // Storage quote submission: server-authoritative pricing, durable log,
  // lead-pipeline forward with retry, graceful failure for the client.
  app.post("/api/quote", async (req, res) => {
    try {
      const { status, body } = await handleQuoteSubmission(req.body);
      res.status(status).json(body);
    } catch (err) {
      console.error("[quote] unhandled error:", err instanceof Error ? err.message : String(err));
      res.status(500).json({ ok: false, error: "We couldn't record your request. Please try again." });
    }
  });

  // Contact submission: durable log + lead-pipeline forward + graceful failure.
  app.post("/api/contact", async (req, res) => {
    try {
      const { status, body } = await handleContactSubmission(req.body);
      res.status(status).json(body);
    } catch (err) {
      console.error("[contact] unhandled error:", err instanceof Error ? err.message : String(err));
      res.status(500).json({ ok: false, error: "We couldn't record your message. Please try again." });
    }
  });

  // The canonical Terms of Service now lives on the A1 Marine umbrella. Redirect
  // /terms (direct loads, the old SPA route, and booking-consent links all land
  // here) with a real 301 — declared before the static + SPA-fallback handlers
  // so no dead page is ever served and no client-side bounce occurs.
  app.get(["/terms", "/terms/"], (_req, res) => {
    res.redirect(301, "https://a1marine.ca/terms");
  });

  // Generated sitemap from the shared SEO registry — declared before the static
  // handler so it always wins over any stale physical sitemap.xml.
  app.get("/sitemap.xml", (_req, res) => {
    res.type("application/xml").send(renderSitemap());
  });

  // index:false so directory requests ("/", "/boat-storage/") fall through to the
  // meta-injecting handler below instead of static-serving the un-injected index.html.
  app.use(express.static(staticPath, { index: false }));

  // Client-side routing: serve index.html with the route's SEO <head> injected,
  // so crawlers and social scrapers get real per-page title/description/canonical
  // + JSON-LD without running the SPA's JS. Unknown routes return a real 404.
  let indexHtmlCache: string | null = null;
  const indexHtml = (): string => {
    if (indexHtmlCache === null) {
      indexHtmlCache = fs.readFileSync(path.join(staticPath, "index.html"), "utf-8");
    }
    return indexHtmlCache;
  };
  app.get("*", (req, res) => {
    try {
      const html = injectMeta(indexHtml(), getPageMeta(req.path));
      res.status(hasPage(req.path) ? 200 : 404).type("html").send(html);
    } catch (err) {
      console.error("[seo] meta injection failed, serving base index.html:", err instanceof Error ? err.message : String(err));
      res.sendFile(path.join(staticPath, "index.html"));
    }
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
