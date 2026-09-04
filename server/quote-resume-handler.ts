// GET /api/quote/resume?q= — the other half of the link printed on every PDF.
//
// The token is self-contained and signed, so this endpoint holds no state: it
// verifies, decodes, and hands back the SELECTION. No prices are returned and
// none are stored in the token — the calculator re-prices through the engine on
// arrival, so a resumed quote always shows today's numbers rather than a
// remembered total that may no longer be true.
import {
  decodeResumeToken,
  decodeResumeTokenIgnoringAge,
  ResumeTokenError,
} from "./resume-token";

export interface ResumeResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Map a token failure to a status the client can act on.
 *
 * 410 for expired is the one that matters: it is not an error, it is an
 * outcome, and the calculator answers it by loading the boat details and
 * showing current prices rather than an error page. A 400 would invite the
 * client to treat it as a broken link.
 */
function statusFor(code: ResumeTokenError["code"]): number {
  return code === "expired" ? 410 : 400;
}

export function handleQuoteResume(token: unknown): ResumeResult {
  const q = typeof token === "string" ? token : "";
  if (!q) {
    return {
      status: 400,
      body: {
        ok: false,
        code: "malformed",
        error: "This quote link is missing its token.",
      },
    };
  }

  try {
    const state = decodeResumeToken(q);
    return {
      status: 200,
      body: {
        ok: true,
        selection: state.selection,
        boat: state.boat,
        ref: state.ref,
        issuedAt: state.iat,
      },
    };
  } catch (err) {
    if (err instanceof ResumeTokenError) {
      // An expired token is still one WE signed, so the boat in it is
      // trustworthy — only the prices are stale. Handing it back lets the
      // calculator prefill Step 2 instead of making the customer retype their
      // boat because their link is a week too old. The SELECTION is
      // deliberately not returned: re-picking a package is how they see current
      // prices rather than a remembered choice presented as current.
      if (err.code === "expired") {
        try {
          const stale = decodeResumeTokenIgnoringAge(q);
          return {
            status: 410,
            body: {
              ok: false,
              code: "expired",
              error: err.message,
              boat: stale.boat,
              ref: stale.ref,
            },
          };
        } catch {
          /* Fall through to the plain expired answer. */
        }
      }
      return {
        status: statusFor(err.code),
        body: { ok: false, code: err.code, error: err.message },
      };
    }
    console.error(
      "[quote-resume] unexpected failure:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      status: 400,
      body: {
        ok: false,
        code: "malformed",
        error: "This quote link could not be read.",
      },
    };
  }
}
