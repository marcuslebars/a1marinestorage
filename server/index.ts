import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { handleQuoteSubmission } from "./quote-handler";
import { handleContactSubmission } from "./contact-handler";

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

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
