create extension if not exists pgcrypto;

create type public.match_status as enum ('waiting', 'live', 'finished');
create type public.order_side as enum ('buy', 'sell');
create type public.order_type as enum ('market', 'limit');
create type public.order_status as enum ('open', 'partial', 'filled', 'cancelled', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar_seed text not null default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  name text not null check (char_length(name) between 1 and 32),
  host_id uuid not null references public.profiles(id),
  status public.match_status not null default 'waiting',
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  seed_hash text not null,
  status public.match_status not null default 'live',
  tick integer not null default 0 check (tick >= 0),
  max_ticks integer not null default 600 check (max_ticks > 0),
  starting_cash bigint not null default 10000000 check (starting_cash > 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.match_secrets (
  match_id uuid primary key references public.matches(id) on delete cascade,
  seed text not null,
  created_at timestamptz not null default now()
);

create table public.assets (
  symbol text primary key check (symbol in ('NEON','CHIP','ACES','DICE','LUCK','JKPT')),
  name text not null,
  base_price bigint not null check (base_price > 0),
  drift numeric not null,
  vol numeric not null check (vol > 0),
  beta numeric not null check (beta > 0),
  tick_size integer not null check (tick_size > 0),
  character text not null
);

insert into public.assets (symbol, name, base_price, drift, vol, beta, tick_size, character) values
('NEON','Neon Holdings',42000,0.00008,0.0068,1.55,5,'High voltage. Higher variance.'),
('CHIP','Chipwright Semis',28500,0.00006,0.0042,1.20,5,'Silicon with a casino habit.'),
('ACES','Aces Logistics',16000,0.00003,0.0017,0.65,5,'Slow trucks. Steady books.'),
('DICE','Dice Mobility',9250,0.00002,0.0037,1.05,5,'Every route is a gamble.'),
('LUCK','Lucky Staples',12750,0.000025,0.0013,0.35,5,'Defensive, until it is not.'),
('JKPT','Jackpot Energy',52500,0.00004,0.0051,1.40,5,'Megawatts and mood swings.');

create table public.market_ticks (
  match_id uuid not null references public.matches(id) on delete cascade,
  symbol text not null references public.assets(symbol),
  tick integer not null check (tick >= 0),
  mid bigint not null check (mid > 0),
  bid bigint not null check (bid > 0),
  ask bigint not null check (ask > 0),
  volume integer not null default 0 check (volume >= 0),
  primary key (match_id, symbol, tick),
  check (ask >= bid)
);

create table public.accounts (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  cash bigint not null check (cash >= 0),
  reserved bigint not null check (reserved >= 0),
  primary key (match_id, user_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  symbol text not null references public.assets(symbol),
  side public.order_side not null,
  type public.order_type not null,
  status public.order_status not null default 'open',
  qty integer not null check (qty > 0),
  filled_qty integer not null default 0 check (filled_qty >= 0 and filled_qty <= qty),
  limit_price bigint check (limit_price > 0),
  seq bigint not null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 80),
  created_tick integer not null check (created_tick >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check ((type = 'limit' and limit_price is not null) or (type = 'market' and limit_price is null))
);

create table public.fills (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  order_id uuid not null references public.orders(id),
  counterparty_order_id text,
  symbol text not null references public.assets(symbol),
  buyer_id uuid references public.profiles(id),
  seller_id uuid references public.profiles(id),
  qty integer not null check (qty > 0),
  price bigint not null check (price > 0),
  tick integer not null check (tick >= 0),
  house boolean not null default false
);

create table public.positions (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  symbol text not null references public.assets(symbol),
  qty integer not null default 0 check (qty >= 0),
  reserved_qty integer not null default 0 check (reserved_qty >= 0 and reserved_qty <= qty),
  cost_basis bigint not null default 0 check (cost_basis >= 0),
  primary key (match_id, user_id, symbol)
);

create table public.market_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  event_type text not null check (event_type = 'meltdown'),
  headline text not null,
  severity numeric not null check (severity between 0 and 1),
  affected_assets text[] not null,
  start_tick integer not null,
  duration integer not null check (duration between 3 and 5),
  before jsonb not null,
  after jsonb,
  created_at timestamptz not null default now()
);

create table public.portfolio_snapshots (
  id bigserial primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  tick integer not null check (tick >= 0),
  equity bigint not null check (equity >= 0),
  pnl bigint not null,
  unique (match_id, user_id, tick)
);

create table public.replay_events (
  id bigserial primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  seq bigint not null,
  tick integer not null check (tick >= 0),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (match_id, seq)
);

create table public.match_state (
  match_id uuid primary key references public.matches(id) on delete cascade,
  state jsonb not null,
  public_state jsonb not null,
  updated_at timestamptz not null default now()
);

create index rooms_code_idx on public.rooms(code);
create index room_members_user_idx on public.room_members(user_id);
create index matches_room_idx on public.matches(room_id);
create index orders_match_user_idx on public.orders(match_id, user_id);
create index orders_match_asset_status_idx on public.orders(match_id, symbol, status);
create index orders_match_seq_idx on public.orders(match_id, seq);
create index fills_match_user_buyer_idx on public.fills(match_id, buyer_id);
create index fills_match_user_seller_idx on public.fills(match_id, seller_id);
create index ticks_match_symbol_idx on public.market_ticks(match_id, symbol, tick desc);
create index replay_match_seq_idx on public.replay_events(match_id, seq);
create index snapshots_match_tick_idx on public.portfolio_snapshots(match_id, tick);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_room_member(target_room uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_members where room_id = target_room and user_id = auth.uid());
$$;

create or replace function private.is_match_member(target_match uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches m join public.room_members rm on rm.room_id = m.room_id
    where m.id = target_match and rm.user_id = auth.uid()
  );
$$;

create or replace function private.is_match_host(target_match uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches m join public.rooms r on r.id = m.room_id
    where m.id = target_match and r.host_id = auth.uid()
  );
$$;

grant execute on function private.is_room_member(uuid) to authenticated;
grant execute on function private.is_match_member(uuid) to authenticated;
grant execute on function private.is_match_host(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.matches enable row level security;
alter table public.match_secrets enable row level security;
alter table public.assets enable row level security;
alter table public.market_ticks enable row level security;
alter table public.accounts enable row level security;
alter table public.orders enable row level security;
alter table public.fills enable row level security;
alter table public.positions enable row level security;
alter table public.market_events enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.replay_events enable row level security;
alter table public.match_state enable row level security;

create policy "authenticated read profiles" on public.profiles for select to authenticated using (true);
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "members read rooms" on public.rooms for select to authenticated using (private.is_room_member(id));
create policy "members read memberships" on public.room_members for select to authenticated using (private.is_room_member(room_id));
create policy "members read matches" on public.matches for select to authenticated using (private.is_match_member(id));
create policy "authenticated read assets" on public.assets for select to authenticated using (true);
create policy "members read ticks" on public.market_ticks for select to authenticated using (private.is_match_member(match_id));
create policy "own account" on public.accounts for select to authenticated using (user_id = auth.uid() and private.is_match_member(match_id));
create policy "own orders" on public.orders for select to authenticated using (user_id = auth.uid() and private.is_match_member(match_id));
create policy "own fills" on public.fills for select to authenticated using ((buyer_id = auth.uid() or seller_id = auth.uid()) and private.is_match_member(match_id));
create policy "own positions" on public.positions for select to authenticated using (user_id = auth.uid() and private.is_match_member(match_id));
create policy "members read events" on public.market_events for select to authenticated using (private.is_match_member(match_id));
create policy "members read snapshots" on public.portfolio_snapshots for select to authenticated using (private.is_match_member(match_id));
create policy "finished replay visible to members" on public.replay_events for select to authenticated using (
  private.is_match_member(match_id) and exists (select 1 from public.matches where id = match_id and status = 'finished')
);
-- No policies on match_secrets or match_state: service role only.

create policy "match members receive broadcasts" on realtime.messages for select to authenticated using (
  realtime.topic() like 'match:%' and private.is_match_member(substring(realtime.topic() from 7)::uuid)
);
create policy "match members send broadcasts" on realtime.messages for insert to authenticated with check (
  realtime.topic() like 'match:%' and private.is_match_member(substring(realtime.topic() from 7)::uuid)
);

create or replace function public.create_room(room_name text)
returns table (id uuid, code text, name text)
language plpgsql security definer set search_path = '' as $$
declare new_id uuid; new_code text; attempts integer := 0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(trim(room_name)) not between 1 and 32 then raise exception 'INVALID_ROOM_NAME'; end if;
  insert into public.profiles (id, display_name) values (auth.uid(), 'Player ' || left(auth.uid()::text, 6))
    on conflict (id) do nothing;
  loop
    new_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.rooms where rooms.code = new_code);
    attempts := attempts + 1;
    if attempts > 8 then raise exception 'CODE_GENERATION_FAILED'; end if;
  end loop;
  insert into public.rooms (code, name, host_id) values (new_code, trim(room_name), auth.uid()) returning rooms.id into new_id;
  insert into public.room_members (room_id, user_id, ready) values (new_id, auth.uid(), false);
  return query select new_id, new_code, trim(room_name);
end;
$$;

create or replace function public.join_room(room_code text)
returns table (id uuid, code text, name text)
language plpgsql security definer set search_path = '' as $$
declare target public.rooms%rowtype; member_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target from public.rooms where upper(rooms.code) = upper(trim(room_code)) and status = 'waiting';
  if target.id is null then raise exception 'ROOM_NOT_FOUND'; end if;
  select count(*) into member_count from public.room_members where room_id = target.id;
  if member_count >= 8 and not exists (select 1 from public.room_members where room_id = target.id and user_id = auth.uid()) then raise exception 'ROOM_FULL'; end if;
  insert into public.profiles (id, display_name) values (auth.uid(), 'Player ' || left(auth.uid()::text, 6)) on conflict (id) do nothing;
  insert into public.room_members (room_id, user_id) values (target.id, auth.uid()) on conflict do nothing;
  return query select target.id, target.code, target.name;
end;
$$;

create or replace function public.set_ready(target_room uuid, is_ready boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.room_members set ready = is_ready where room_id = target_room and user_id = auth.uid();
  if not found then raise exception 'NOT_A_MEMBER'; end if;
end;
$$;

create or replace function public.start_match(target_room uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_match uuid; generated_seed text; room_host uuid;
begin
  select host_id into room_host from public.rooms where id = target_room and status = 'waiting';
  if room_host is null then raise exception 'ROOM_NOT_FOUND'; end if;
  if room_host <> auth.uid() then raise exception 'HOST_ONLY'; end if;
  if exists (select 1 from public.room_members where room_id = target_room and ready = false) then raise exception 'PLAYERS_NOT_READY'; end if;
  generated_seed := encode(gen_random_bytes(32), 'hex');
  insert into public.matches (room_id, seed_hash) values (target_room, encode(digest(generated_seed, 'sha256'), 'hex')) returning id into new_match;
  insert into public.match_secrets (match_id, seed) values (new_match, generated_seed);
  insert into public.accounts (match_id, user_id, cash, reserved)
    select new_match, user_id, 10000000, 0 from public.room_members where room_id = target_room;
  update public.rooms set status = 'live' where id = target_room;
  return new_match;
end;
$$;

revoke all on function public.create_room(text) from public;
revoke all on function public.join_room(text) from public;
revoke all on function public.set_ready(uuid, boolean) from public;
revoke all on function public.start_match(uuid) from public;
grant execute on function public.create_room(text) to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.set_ready(uuid, boolean) to authenticated;
grant execute on function public.start_match(uuid) to authenticated;

grant select on public.profiles, public.rooms, public.room_members, public.matches, public.assets, public.market_ticks, public.accounts, public.orders, public.fills, public.positions, public.market_events, public.portfolio_snapshots, public.replay_events to authenticated;
revoke all on public.match_secrets from anon, authenticated;
revoke all on public.match_state from anon, authenticated;
