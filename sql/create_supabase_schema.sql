-- SQL: create tables for OmniSolutions (run once in Supabase SQL editor)

-- Contractors
create table if not exists contractors (
  id text primary key,
  auth_uid text, -- optional mapping to supabase auth user id
  company_name text,
  contact_name text,
  phone text,
  email text,
  service_primary text,
  logo_url text,
  telegram_token text, -- contractor's own bot (OPTIONAL) - use with caution
  telegram_chat_id text,
  badge text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- Services
create table if not exists services (
  id text primary key,
  category text,
  name text
);

-- Leads
create table if not exists leads (
  id bigint generated always as identity primary key,
  customer_name text,
  phone text,
  email text,
  service text,
  message text,
  contractor_id text,
  created_at timestamptz default now()
);

-- Reviews
create table if not exists reviews (
  id bigint generated always as identity primary key,
  contractor_id text,
  reviewer_name text,
  rating int,
  comment text,
  images text[],
  created_at timestamptz default now()
);

-- Badges log
create table if not exists badges (
  id bigint generated always as identity primary key,
  contractor_id text,
  badge_type text,
  assigned_at timestamptz default now()
);

-- Indexes
create index if not exists idx_contractors_auth on contractors(auth_uid);
create index if not exists idx_leads_contractor on leads(contractor_id);
create index if not exists idx_reviews_contractor on reviews(contractor_id);
