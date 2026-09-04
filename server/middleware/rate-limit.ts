// Per-endpoint rate limits.
//
// The limits differ because the COSTS differ. A PDF render is CPU; a Nominatim
// lookup spends someone else's quota and can get our User-Agent banned; a
// submission writes a durable record and emails a human. The resume endpoint is
// generous because a customer refreshing their own link is not abuse.
//
// Keyed on the proxy-forwarded IP — Railway terminates TLS upstream, so
// req.ip is the proxy without `trust proxy` set (done in server/index.ts).
import rateLimit, { type Options } from "express-rate-limit";

/** The site's existing error shape, so a 429 looks like every other failure. */
function jsonLimit(message: string): Partial<Options> {
  return {
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ ok: false, error: message });
    },
  };
}

export const pdfLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  ...jsonLimit(
    "You've generated several quotes just now — give it a minute and try again."
  ),
});

export const transportBandLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  ...jsonLimit(
    "Too many lookups just now — give it a minute, or pick the nearest town."
  ),
});

export const submissionLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  ...jsonLimit(
    "That's a lot of submissions from one place. Call us on (249) 444-0072 and we'll sort it out."
  ),
});

export const resumeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  ...jsonLimit("Too many requests just now — refresh in a moment."),
});
