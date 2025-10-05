-- Add image_url column for image messages
alter table public.messages 
add column if not exists image_url text;

-- Add reactions column for message reactions
alter table public.messages 
add column if not exists reactions jsonb default '[]'::jsonb;
