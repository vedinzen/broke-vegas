create index if not exists accounts_user_idx on public.accounts(user_id);
create index if not exists fills_buyer_idx on public.fills(buyer_id);
create index if not exists fills_order_idx on public.fills(order_id);
create index if not exists fills_seller_idx on public.fills(seller_id);
create index if not exists fills_symbol_idx on public.fills(symbol);
create index if not exists events_match_idx on public.market_events(match_id);
create index if not exists ticks_symbol_idx on public.market_ticks(symbol);
create index if not exists orders_symbol_idx on public.orders(symbol);
create index if not exists snapshots_user_idx on public.portfolio_snapshots(user_id);
create index if not exists positions_symbol_idx on public.positions(symbol);
create index if not exists positions_user_idx on public.positions(user_id);
create index if not exists rooms_host_idx on public.rooms(host_id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "own account" on public.accounts;
create policy "own account" on public.accounts for select to authenticated using (user_id = (select auth.uid()) and private.is_match_member(match_id));
drop policy if exists "own orders" on public.orders;
create policy "own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()) and private.is_match_member(match_id));
drop policy if exists "own fills" on public.fills;
create policy "own fills" on public.fills for select to authenticated using ((buyer_id = (select auth.uid()) or seller_id = (select auth.uid())) and private.is_match_member(match_id));
drop policy if exists "own positions" on public.positions;
create policy "own positions" on public.positions for select to authenticated using (user_id = (select auth.uid()) and private.is_match_member(match_id));

revoke all on function public.create_room(text) from anon;
revoke all on function public.join_room(text) from anon;
revoke all on function public.set_ready(uuid, boolean) from anon;
revoke all on function public.start_match(uuid) from anon;
revoke all on function public.rls_auto_enable() from anon, authenticated;
