// Day 25 of a 30-day quote: the prices are about to stop being current.
//
// Only rows that are still NOT reserved. Emailing someone who has already paid
// a deposit that their quote is expiring would be alarming and wrong.
import { renderExpiryD25 } from "../notify/templates/nurture";
import { validUntil } from "../notify/templates/pdf-copy";
import { encodeResumeToken, resumeUrlFor } from "../resume-token";
import {
  findQuietQuotes,
  publicOrigin,
  runNurture,
  sendNurture,
} from "./nurture";
import type { Job } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export const job: Job = {
  name: "expiry-d25",
  run: () =>
    runNurture("expiry-d25", async () => {
      const rows = await findQuietQuotes({
        sources: ["saved", "pdf_download", "calculator"],
        minAgeMs: 25 * DAY,
        // Day 25 to 30. Past 30 the prices have lapsed and the email would be
        // announcing something that already happened.
        maxAgeMs: 30 * DAY,
        statuses: ["new", "quoted"],
      });

      let sent = 0;
      for (const row of rows) {
        const resumeUrl = resumeUrlFor(
          encodeResumeToken({
            selection: row.selection,
            boat: row.boat,
            ref: row.reference ?? undefined,
          }),
          publicOrigin()
        );
        const ok = await sendNurture(row, "expiry_d25", unsubscribeUrl =>
          renderExpiryD25({
            resumeUrl,
            unsubscribeUrl,
            quote: row.quote as never,
            // Counted from when the quote was made, not from today.
            validUntil: validUntil(new Date(row.received_at)),
          })
        );
        if (ok) sent += 1;
      }
      return sent;
    }),
};
