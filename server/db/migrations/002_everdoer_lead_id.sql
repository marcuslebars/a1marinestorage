-- Everdoer rebrand: quotes.empirevu_lead_id -> quotes.everdoer_lead_id.
--
-- EXPAND, not rename. `pnpm start` runs the migrator and then starts the
-- server EVEN IF THE MIGRATOR FAILED, and during a Railway deploy the previous
-- container keeps serving until the new one is healthy. A direct RENAME would
-- break whichever code is on the other side of it: the old container writing
-- empirevu_lead_id after the rename, or the new one writing everdoer_lead_id
-- when this migration did not apply. So:
--
--   1. this migration adds everdoer_lead_id and backfills it;
--   2. the code writes BOTH columns (and falls back to the old column alone if
--      this one is missing); anything reading uses
--      coalesce(everdoer_lead_id, empirevu_lead_id);
--   3. LATER, once no deployed code writes empirevu_lead_id, a separate
--      migration backfills once more and drops empirevu_lead_id.
--
-- Idempotent: safe to run again by hand. Rollback (applied by hand, never by
-- the migrator): server/db/rollbacks/002_everdoer_lead_id.down.sql.
alter table quotes add column if not exists everdoer_lead_id text;

update quotes
   set everdoer_lead_id = empirevu_lead_id
 where everdoer_lead_id is null
   and empirevu_lead_id is not null;
