alter table public.products
  add column if not exists availability_status text not null default 'available',
  add column if not exists track_inventory boolean not null default false,
  add column if not exists stock_quantity integer not null default 0,
  add column if not exists low_stock_threshold integer not null default 0,
  add column if not exists allow_backorder boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid,
  add column if not exists delete_note text;

alter table public.products
  drop constraint if exists products_availability_status_valid,
  add constraint products_availability_status_valid
    check (availability_status in ('available', 'out_of_stock', 'made_to_order')),
  drop constraint if exists products_stock_nonnegative,
  add constraint products_stock_nonnegative
    check (stock_quantity >= 0 and low_stock_threshold >= 0),
  drop constraint if exists products_deleted_archived_private,
  add constraint products_deleted_archived_private
    check (deleted_at is null or (status = 'archived' and visibility = 'private'));

create table if not exists public.product_stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  delta integer not null,
  resulting_quantity integer not null,
  reason text not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint product_stock_movements_reason_not_blank check (length(trim(reason)) > 0)
);

create index if not exists product_stock_movements_product_created_idx
  on public.product_stock_movements (product_id, created_at desc);
create index if not exists product_stock_movements_order_idx
  on public.product_stock_movements (order_id)
  where order_id is not null;

alter table public.product_stock_movements enable row level security;

drop policy if exists "admins read product stock movements" on public.product_stock_movements;
create policy "admins read product stock movements" on public.product_stock_movements
  for select to authenticated
  using (public.is_active_admin());

drop policy if exists "owners and admins manage product stock movements" on public.product_stock_movements;
create policy "owners and admins manage product stock movements" on public.product_stock_movements
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));
