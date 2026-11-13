-- Rode UMA vez em cada projeto: Supabase > SQL Editor > New query > colar > Run.
-- Cria uma tabela mínima que só o keep-alive lê. Nenhuma tabela sua fica exposta.

create table if not exists public.keepalive (
  id int primary key,
  criado_em timestamptz not null default now()
);

insert into public.keepalive (id) values (1) on conflict (id) do nothing;

alter table public.keepalive enable row level security;

drop policy if exists "keepalive leitura publica" on public.keepalive;
create policy "keepalive leitura publica"
  on public.keepalive for select
  to anon, authenticated
  using (true);

grant select on public.keepalive to anon, authenticated;
