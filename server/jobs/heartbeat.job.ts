import type { Job } from "./types";

/**
 * Proves the runner works before Phase 3 hangs real jobs off it.
 *
 * Deliberately does nothing: if the cron service is misconfigured, this is the
 * line whose ABSENCE from the logs tells you, without a customer being involved.
 */
export const job: Job = {
  name: "heartbeat",
  async run() {
    console.log(`[jobs] heartbeat ok — ${new Date().toISOString()}`);
    return { processed: 0 };
  },
};
