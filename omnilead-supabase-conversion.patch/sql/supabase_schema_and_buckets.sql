-- Enable uuid-ossp extension (if not already)
create extension if not exists "uuid-ossp";

-- Contractors
create table if not exists contractors (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid references auth.users(id) on delete set null,
  name text,
  company_name text,
  phone text,
  email text,
  service text,
  logo_url text,
  telegram_token text,
  telegram_chat_id text,
  badge text,
  premium boolean default false,
  subscription_plan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Services
create table if not exists services (
  id uuid primary key default uuid_generate_v4(),
  category text,
  name text,
  description text,
  created_at timestamptz default now()
);

-- Leads
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  contractor_id uuid references contractors(id) on delete set null,
  customer_name text,
  phone text,
  email text,
  service text,
  message text,
  source text default 'web',
  created_at timestamptz default now()
);

-- Reviews
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  contractor_id uuid references contractors(id) on delete cascade,
  reviewer_name text,
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  images text[],
  created_at timestamptz default now()
);

-- Messages (contractor -> admin)
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  contractor_id uuid references contractors(id) on delete cascade,
  message text,
  created_at timestamptz default now()
);

-- Badges
create table if not exists badges (
  id uuid primary key default uuid_generate_v4(),
  contractor_id uuid references contractors(id) on delete cascade,
  badge_type text,
  assigned_at timestamptz default now()
);

-- Indexes for speed
create index if not exists idx_contractors_auth on contractors(auth_id);
create index if not exists idx_leads_contractor on leads(contractor_id);
create index if not exists idx_reviews_contractor on reviews(contractor_id);
create index if not exists idx_messages_contractor on messages(contractor_id);

-- NOTE: create Storage buckets using Supabase UI (Storage > Create new bucket)
-- Create two public buckets named 'logos' and 'reviews'
-- After creating buckets, enable "Public" if you want images to be directly accessible via public URLs.

-- Example: to create via psql or via API you may use Storage API. For SQL editor, run the commands below ONLY if you have a function available to manage buckets.
-- (Prefer using Supabase UI: Storage -> New bucket -> name 'logos' and 'reviews' -> Public access ON)
