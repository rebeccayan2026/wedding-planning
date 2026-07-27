-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- to set up the tables Sparks AI needs.

create table if not exists planners (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  created_at timestamptz not null default now()
);

-- One row per message the model has already triaged, so re-opening the app
-- doesn't pay for the same analysis twice.
create table if not exists email_risk_flags (
  id uuid primary key default gen_random_uuid(),
  planner_id uuid not null references planners(id) on delete cascade,
  gmail_message_id text not null,
  subject text,
  from_address text,
  snippet text,
  date text,
  risk text not null check (risk in ('high', 'medium', 'low')),
  reason text,
  category text,
  -- What the planner has to do about it, imperative and short.
  action text,
  -- Only set when the message stated a due date outright.
  deadline text,
  analyzed_at timestamptz not null default now(),
  unique (planner_id, gmail_message_id)
);

-- Existing installs: bring an older table up to date.
alter table email_risk_flags
  add column if not exists category text,
  add column if not exists action   text,
  add column if not exists deadline text;
