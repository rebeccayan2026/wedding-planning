-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- to set up the tables Sparks AI needs.

create table if not exists planners (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  created_at timestamptz not null default now()
);

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
  analyzed_at timestamptz not null default now(),
  unique (planner_id, gmail_message_id)
);
