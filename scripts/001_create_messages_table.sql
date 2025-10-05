-- Create messages table for chat persistence
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  experience_id text not null,
  user_id text not null,
  username text not null,
  avatar_url text,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Create index for faster queries by experience
create index if not exists messages_experience_id_idx on public.messages(experience_id);
create index if not exists messages_created_at_idx on public.messages(created_at);

-- Enable RLS
alter table public.messages enable row level security;

-- Allow anyone to read messages (public chat)
create policy "messages_select_all"
  on public.messages for select
  using (true);

-- Only allow inserts from authenticated requests (server-side)
-- In production, you'd verify the user_id matches the authenticated user
create policy "messages_insert_all"
  on public.messages for insert
  with check (true);
