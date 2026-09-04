// "Download your quote" — the client half of POST /api/quote/pdf.
//
// The request carries the SELECTION and the boat, never a price. The server
// re-prices through the engine and renders from that, which is what guarantees
// the PDF and the on-screen panel agree: both are the engine's answer to the
// same question. There is deliberately nowhere in this request to put a total.
//
// The email is a SOFT gate. It is asked for, never required — a customer still
// deciding should not have to trade an address for the quote they were just
// shown. When they do give one, the server files it as a lead, because
// downloading a quote is high intent.
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import type { BoatState, Selection } from "@/lib/quote-items";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DownloadQuoteButton({
  selection,
  boat,
  defaultEmail = "",
}: {
  selection: Selection;
  boat: BoatState;
  /** Prefilled from the contact step when they have already typed one. */
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/quote/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only send an email if it looks like one. A half-typed address is not
        // worth filing as a lead, and the download must not fail over it.
        body: JSON.stringify({
          selection,
          boat,
          email: EMAIL_RE.test(email.trim()) ? email.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          data.error ?? "We couldn't build your quote. Please try again."
        );
        return;
      }

      const ref = res.headers.get("X-Quote-Reference");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Prefer the server's filename; it carries the quote reference.
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "a1-marine-storage-quote.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoking immediately can cancel the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);

      if (ref) setReference(ref);
      // Engine-derived only — no address, no personal data.
      track("quote_pdf_downloaded", { boat_length: boat.lengthFt });
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="marine-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.6_0.2_27)/12]">
          <Download className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Take your quote with you
          </p>
          <p className="mt-0.5 text-xs text-white/50">
            A PDF of everything above, with a link to pick up where you left
            off. Valid 30 days.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              /*
               * SAYS WHAT THE CODE DOES, AND ONLY THAT.
               *
               * This read "Email it to me too (optional)" while nothing on the
               * server sent anything: the address was filed as a lead and the
               * customer waited for an email that was never coming. Saving the
               * address is exactly what happens, so that is what it says.
               *
               * Flip this back to "Email me a copy too (optional)" in the SAME
               * change that turns the send on — once the Resend domain is
               * verified and a real send has been seen in production. The copy
               * and the behaviour ship together or not at all.
               */
              placeholder="Save my email with this quote (optional)"
              className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-[oklch(0.6_0.2_27)]"
            />
            <button
              type="button"
              onClick={() => void download()}
              disabled={busy}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[oklch(0.6_0.2_27)] px-4 text-sm font-semibold text-[oklch(0.12_0.018_240)] hover:bg-[oklch(0.53_0.2_27)] disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {busy ? "Preparing…" : "Download PDF"}
            </button>
          </div>

          {error && <p className="mt-2 text-xs text-yellow-400">{error}</p>}
          {reference && !error && (
            <p className="mt-2 text-xs text-white/50">
              Downloaded — your reference is{" "}
              <span className="font-mono text-white/80">{reference}</span>.
              Quote it when you call and we'll pull up exactly this.
            </p>
          )}
          <p className="mt-2 text-xs text-white/35">
            The email is optional — you get the PDF either way.
          </p>
        </div>
      </div>
    </div>
  );
}
