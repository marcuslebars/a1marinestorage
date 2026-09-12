// Two hours after someone built a quote and left without submitting it.
//
// The window has an UPPER bound as well as a lower one. Without it, the first
// run after this ships would mail every saved quote ever recorded — a mass
// mailing nobody asked for, from a job whose whole point is a gentle nudge.
import { renderAbandoned2h } from "../notify/templates/nurture";
import { encodeResumeToken, resumeUrlFor } from "../resume-token";
import {
  findQuietQuotes,
  publicOrigin,
  runNurture,
  sendNurture,
} from "./nurture";
import type { Job } from "./types";

const HOUR = 60 * 60 * 1000;

export const job: Job = {
  name: "abandoned-2h",
  run: () =>
    runNurture("abandoned-2h", async () => {
      const rows = await findQuietQuotes({
        // Someone who submitted a full quote is already in a conversation.
        // These two are the people who left an address and stopped.
        sources: ["saved", "pdf_download"],
        minAgeMs: 2 * HOUR,
        maxAgeMs: 24 * HOUR,
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
        const ok = await sendNurture(row, "abandoned_2h", unsubscribeUrl =>
          renderAbandoned2h({
            resumeUrl,
            unsubscribeUrl,
            quote: row.quote as never,
          })
        );
        if (ok) sent += 1;
      }
      return sent;
    }),
};
