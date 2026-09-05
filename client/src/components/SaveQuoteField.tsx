// "Email me the link to this quote."
//
// The lightest commitment on the page: one field, no name, no phone. Someone
// who is not ready to be contacted can still leave with their quote, and the
// yard still learns a real address.
//
// THE COPY FOLLOWS THE SERVER. The success line says "sent" only when the
// server reports it actually sent something; when mail is unconfigured it says
// the quote is saved, which is what happened.
import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";

import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import type { BoatState, Selection } from "@/lib/quote-items";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SaveQuoteField({
  selection,
  boat,
}: {
  selection: Selection;
  boat: BoatState;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"emailed" | "saved" | null>(null);
  const [error, setError] = useState("");

  const valid = EMAIL_RE.test(email.trim());

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/quote/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), selection, boat }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        emailed?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "We couldn't save that. Please try again.");
        return;
      }
      setDone(data.emailed ? "emailed" : "saved");
      // No address in the event — the rule is the rule.
      track("quote_saved");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="marine-card flex items-start gap-3 p-4">
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[oklch(0.6_0.2_27)]" />
        <p className="text-sm text-white/80">
          {done === "emailed"
            ? "Sent — check your inbox for the link back to this quote."
            : "Saved. We have your quote; we'll be in touch with the link."}
        </p>
      </div>
    );
  }

  return (
    <div className="marine-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.6_0.2_27)/12]">
          <Mail className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Not ready to decide?
          </p>
          <p className="mt-0.5 text-xs text-white/50">
            We'll email you a link back to this exact quote. No name, no phone
            call.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") void save();
              }}
              placeholder="you@example.com"
              className="h-11 border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-[oklch(0.6_0.2_27)]"
            />
            <button
              type="button"
              onClick={() => void save()}
              disabled={!valid || busy}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[oklch(0.6_0.2_27)] px-4 text-sm font-semibold text-[oklch(0.12_0.018_240)] hover:bg-[oklch(0.53_0.2_27)] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Sending…" : "Email me the link"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-yellow-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
