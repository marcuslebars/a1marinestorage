-- Phase 0: the durable record.
--
-- Until now the only record of a lead was a JSONL file on Railway's filesystem,
-- which does not survive a redeploy. Every quote this site has ever taken has
-- been one deploy away from gone.
--
-- Everything here is additive. The JSONL writes continue as a mirror, and a
-- handler reports success if EITHER store accepted the record.

create table if not exists quotes (
  id uuid primary key,
  -- A1MS-Q-XXXXXX, allocated when a PDF is generated. Null for quotes that
  -- never produced one, which is why it is nullable rather than the key.
  reference text unique,
  received_at timestamptz not null,
  -- calculator | pdf_download | saved | contact | winter-quote | locality
  source text not null,
  -- new | quoted | reserved | scheduled | in_yard | launched | lost
  status text not null default 'new',
  -- Normalised at the edge: E.164 phone, lowercased email, collapsed name.
  contact jsonb not null,
  -- The engine INPUT and RESULT, kept apart on purpose: the input is what we can
  -- re-price later, the result is what the customer was actually shown.
  quote_input jsonb,
  quote jsonb,
  -- The client Selection, so a quote can be resumed exactly as it was built.
  selection jsonb,
  boat jsonb,
  -- utm, page, logistics, preferred dates, eligibility.
  meta jsonb not null default '{}',
  deposit_url text,
  empirevu_lead_id text,
  updated_at timestamptz not null default now()
);

create index if not exists quotes_status_received_idx on quotes (status, received_at desc);
-- Finding every quote for one person, which is the first thing anyone asks.
create index if not exists quotes_contact_email_idx on quotes ((contact ->> 'email'));

-- One row per message actually sent. The unique key IS the idempotency lock:
-- a job that runs twice, or a handler that is retried, cannot double-send.
create table if not exists notifications (
  id bigserial primary key,
  -- Cascade: deleting a test quote must not fail on this reference. Without it,
  -- cleaning up test data means deleting notifications by hand first.
  quote_id uuid references quotes (id) on delete cascade,
  -- quote_confirmation | pdf_copy | abandoned_2h | abandoned_3d | expiry_d25 | ...
  kind text not null,
  channel text not null, -- email | sms
  sent_at timestamptz not null default now(),
  provider_id text,
  unique (quote_id, kind, channel)
);

create index if not exists notifications_quote_idx on notifications (quote_id, sent_at desc);

-- Yard capacity, by Monday-anchored week. Drives the week picker and the
-- "N spots left" counter, which must never be invented.
create table if not exists capacity (
  week_start date primary key,
  season text not null, -- e.g. '2026-27'
  spots_total int not null,
  spots_reserved int not null default 0,
  haulout_slots int not null default 0
);

create index if not exists capacity_season_idx on capacity (season, week_start);
