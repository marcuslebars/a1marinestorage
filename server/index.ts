import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { redirectTargetFor } from "./redirects";
import { handleQuoteSubmission } from "./quote-handler";
import { handlePartialQuoteLead } from "./partial-lead-handler";
import { handleContactSubmission } from "./contact-handler";
import { resolveTransportBand, TransportBandError } from "./transport-band";
import { handleQuotePdf, QuotePdfError } from "./quote-pdf-handler";
import { handleQuoteResume } from "./quote-resume-handler";
import { getCapacity } from "./capacity";
import { handleQuoteSave } from "./quote-save-handler";
import { handleUnsubscribe } from "./unsubscribe";
import { assertResumeSecret } from "./resume-token";
import fs from "fs";
import { getPageMeta, hasPage, injectMeta, renderSitemap } from "../shared/seo";
import {
  pdfLimiter,
  resumeLimiter,
  submissionLimiter,
  transportBandLimiter,
} from "./middleware/rate-limit";

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

  // Railway terminates TLS upstream, so without this every request looks like it
  // came from the proxy and one visitor's burst would rate-limit everyone.
  app.set("trust proxy", 1);

  // Loud at boot rather than silently signing 45-day quote links with a
  // constant that is published in this repository.
  assertResumeSecret();

  // ── BRAND RETIRED ─────────────────────────────────────────────────────────
  // A1 Marine Storage is now the mobile shrink-wrap offer on a1marinecare.ca.
  // Every public page on this domain 301s there (see redirects.ts for the map
  // and what is deliberately left alone). Declared FIRST so nothing below —
  // static files, SPA fallback, meta injection — ever serves a storage page
  // again. GET/HEAD only: a POST to /api/* is still an API call.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const search = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    const target = redirectTargetFor(req.path, search);
    if (!target) return next();
    res.set("Cache-Control", "public, max-age=86400");
    res.redirect(301, target);
  });

  app.use(express.json({ limit: "1mb" }));

  // Storage quote submission: server-authoritative pricing, durable log,
  // lead-pipeline forward with retry, graceful failure for the client.
  app.post("/api/quote", submissionLimiter, async (req, res) => {
    try {
      const { status, body } = await handleQuoteSubmission(req.body);
      res.status(status).json(body);
    } catch (err) {
      console.error(
        "[quote] unhandled error:",
        err instanceof Error ? err.message : String(err)
      );
      res.status(500).json({
        ok: false,
        error: "We couldn't record your request. Please try again.",
      });
    }
  });

  // Contact submission: durable log + lead-pipeline forward + graceful failure.
  app.post("/api/contact", submissionLimiter, async (req, res) => {
    try {
      const { status, body } = await handleContactSubmission(req.body);
      res.status(status).json(body);
    } catch (err) {
      console.error(
        "[contact] unhandled error:",
        err instanceof Error ? err.message : String(err)
      );
      res.status(500).json({
        ok: false,
        error: "We couldn't record your message. Please try again.",
      });
    }
  });

  // Resume a quote from the link printed on the PDF. Stateless: the token is
  // signed and self-contained, so this verifies and decodes rather than looking
  // anything up. No prices are returned — the calculator re-prices on arrival.
  app.get("/api/quote/resume", resumeLimiter, (req, res) => {
    const { status, body } = handleQuoteResume(req.query?.q);
    // NEVER CACHED. 410 Gone is cacheable by default, so without this a browser
    // (or any proxy in between) can keep serving one answer for a link whose
    // answer changes — and a customer who came back to a quote would be told it
    // was gone by their own cache. Observed in dev, not theoretical.
    res.set("Cache-Control", "no-store");
    res.status(status).json(body);
  });

  // "Email me the link to this quote." Rate-limited as a submission: it
  // creates a lead row and sends mail, so it belongs in the same bucket as the
  // other two, not the cheap read-only ones.
  app.post("/api/quote/save", submissionLimiter, async (req, res) => {
    try {
      const proto =
        (req.headers["x-forwarded-proto"] as string) ?? req.protocol;
      const { status, body } = await handleQuoteSave({
        ...req.body,
        origin: `${proto}://${req.get("host")}`,
      });
      res.status(status).json(body);
    } catch (err) {
      console.error(
        "[quote-save] unhandled error:",
        err instanceof Error ? err.message : String(err)
      );
      res.status(500).json({
        ok: false,
        error: "We couldn't save your quote. Please try again.",
      });
    }
  });

  // One-click unsubscribe from the reminder emails. Answers HTML because a
  // person clicked it, and always 200 — see the note in unsubscribe.ts.
  app.get("/api/unsubscribe", async (req, res) => {
    const { status, body } = await handleUnsubscribe(req.query?.t);
    res.set("Cache-Control", "no-store");
    res.status(status).type("html").send(body);
  });

  // Yard capacity. Read-only, cached 60s in the module, and DELIBERATELY
  // honest about not knowing: an unseeded table answers with nulls and an
  // empty week list, and the UI shows nothing rather than inventing a number.
  app.get("/api/capacity", async (_req, res) => {
    // Short public cache: this drives a counter on marketing pages and a week
    // picker, neither of which needs second-level freshness.
    res.set("Cache-Control", "public, max-age=60");
    res.json({ ok: true, ...(await getCapacity()) });
  });

  // Downloadable quote PDF. The client sends its SELECTION and the server
  // re-prices through the engine — client totals are never trusted, and the
  // request has nowhere to put a price.
  app.post("/api/quote/pdf", pdfLimiter, async (req, res) => {
    try {
      const proto =
        (req.headers["x-forwarded-proto"] as string) ?? req.protocol;
      const result = await handleQuotePdf({
        selection: req.body?.selection,
        boat: req.body?.boat,
        email: typeof req.body?.email === "string" ? req.body.email : undefined,
        origin: `${proto}://${req.get("host")}`,
        preferredDate:
          typeof req.body?.preferredDate === "string"
            ? req.body.preferredDate
            : undefined,
        preferredTime:
          typeof req.body?.preferredTime === "string"
            ? req.body.preferredTime
            : undefined,
      });

      // Downloading a quote is high intent, so a volunteered email is filed as a
      // lead through the normal durable-first path. BEST-EFFORT on purpose: the
      // download must never be blocked or failed by lead handling. The customer
      // came for their quote.
      //
      // This used to call handleQuoteSubmission with `name: ""` and `phone: ""`.
      // validateContact RETURNS `{ok:false}` rather than throwing, so the
      // `.catch()` below never fired and every one of these leads was discarded
      // in silence. handlePartialQuoteLead validates the email alone, which is
      // the only thing this customer has actually given us.
      if (result.email) {
        void handlePartialQuoteLead({
          email: result.email,
          selection: req.body?.selection,
          boat: req.body?.boat,
          quoteRef: result.reference,
          // The same bytes the customer just downloaded, so the attachment and
          // the download can never be different quotes.
          pdf: result.pdf,
          resumeUrl: result.resumeUrl,
        }).then(r => {
          if (!r.ok) {
            console.error(
              `[quote-pdf] lead capture did not file (${r.reason}) — download unaffected`
            );
          }
        });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`
      );
      res.setHeader("X-Quote-Reference", result.reference);
      res.send(result.pdf);
    } catch (err) {
      if (err instanceof QuotePdfError) {
        const status = err.code === "invalid_selection" ? 400 : 500;
        res
          .status(status)
          .json({ ok: false, code: err.code, error: err.message });
        return;
      }
      console.error(
        "[quote-pdf] unhandled error:",
        err instanceof Error ? err.message : String(err)
      );
      res.status(500).json({
        ok: false,
        error: "We couldn't build your quote PDF. Please try again.",
      });
    }
  });

  // Transport band from a postal code — the fallback when the customer's town
  // isn't in the locality list. Server-side because Nominatim requires a real
  // User-Agent and rate limiting, neither enforceable from a browser, and
  // because geocoding from the client would let anyone proxy through the site.
  app.post("/api/transport/band", transportBandLimiter, async (req, res) => {
    // `postalCode` is still read so a browser running a CACHED older bundle gets
    // a clear answer instead of a puzzling failure — it will not resolve, and
    // saying why is better than a bare 404.
    const place =
      typeof req.body?.place === "string"
        ? req.body.place
        : typeof req.body?.postalCode === "string"
          ? ""
          : "";
    try {
      res.json({ ok: true, ...(await resolveTransportBand(place)) });
    } catch (err) {
      if (err instanceof TransportBandError) {
        // A provider outage is NOT the customer's fault: 503 and a message that
        // sends them to the town list rather than hunting for a typo.
        const status =
          err.code === "invalid_place"
            ? 400
            : err.code === "not_found"
              ? 404
              : 503;
        res
          .status(status)
          .json({ ok: false, code: err.code, error: err.message });
        return;
      }
      console.error(
        "[transport] unhandled error:",
        err instanceof Error ? err.message : String(err)
      );
      res.status(500).json({
        ok: false,
        error: "We couldn't look that up. Please try again.",
      });
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
      indexHtmlCache = fs.readFileSync(
        path.join(staticPath, "index.html"),
        "utf-8"
      );
    }
    return indexHtmlCache;
  };
  app.get("*", (req, res) => {
    try {
      const html = injectMeta(indexHtml(), getPageMeta(req.path));
      res
        .status(hasPage(req.path) ? 200 : 404)
        .type("html")
        .send(html);
    } catch (err) {
      console.error(
        "[seo] meta injection failed, serving base index.html:",
        err instanceof Error ? err.message : String(err)
      );
      res.sendFile(path.join(staticPath, "index.html"));
    }
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
