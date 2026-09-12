// Three days on, with real availability or none at all.
//
// The scarcity line is drawn from the capacity table. When nothing is seeded
// getCapacity() returns null and the email simply does not mention
// availability — inventing "filling fast" would be the exact lie the counter
// rules exist to prevent.
import { getCapacity } from "../capacity";
import { renderAbandoned3d } from "../notify/templates/nurture";
import { encodeResumeToken, resumeUrlFor } from "../resume-token";
import { weekLabel } from "../../shared/when-labels";
import {
  findQuietQuotes,
  publicOrigin,
  runNurture,
  sendNurture,
} from "./nurture";
import type { Job } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export const job: Job = {
  name: "abandoned-3d",
  run: () =>
    runNurture("abandoned-3d", async () => {
      const rows = await findQuietQuotes({
        sources: ["saved", "pdf_download", "calculator"],
        minAgeMs: 3 * DAY,
        maxAgeMs: 10 * DAY,
      });
      if (rows.length === 0) return 0;

      // Read capacity ONCE for the batch, not per row.
      const capacity = await getCapacity();

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
        // Their own requested week, when they picked one — otherwise no week
        // is named rather than a week they never asked about.
        const preferred = row.meta?.preferredDate;
        const label =
          typeof preferred === "string"
            ? `The week of ${weekLabel(preferred).replace(/^Week of /, "")}`
            : null;

        const ok = await sendNurture(row, "abandoned_3d", unsubscribeUrl =>
          renderAbandoned3d({
            resumeUrl,
            unsubscribeUrl,
            quote: row.quote as never,
            spotsLeft: capacity.spotsLeft,
            weekLabel: label,
          })
        );
        if (ok) sent += 1;
      }
      return sent;
    }),
};
