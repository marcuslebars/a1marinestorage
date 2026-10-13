-- Rollback for migrations/002_everdoer_lead_id.sql. Run BY HAND (psql), never
-- by the migrator: it lives outside migrations/ so `pnpm db:migrate` cannot
-- pick it up.
--
-- Copies any lead id that only reached the new column back into the old one,
-- drops the new column, and forgets the migration so the next deploy's
-- migrator would re-apply it. Safe with the rebranded code still deployed: it
-- falls back to writing empirevu_lead_id alone when everdoer_lead_id is
-- missing. Idempotent: running it twice is a no-op the second time.
begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = current_schema()
       and table_name = 'quotes'
       and column_name = 'everdoer_lead_id'
  ) then
    update quotes
       set empirevu_lead_id = everdoer_lead_id
     where empirevu_lead_id is null
       and everdoer_lead_id is not null;
    alter table quotes drop column everdoer_lead_id;
  end if;
end
$$;

delete from schema_migrations where filename = '002_everdoer_lead_id.sql';

commit;
