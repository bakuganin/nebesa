begin;

create extension if not exists pgcrypto;

create type public.product_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.product_visibility as enum ('private', 'public');
create type public.product_order_mode as enum ('disabled', 'priced', 'inquiry_only');
create type public.order_status as enum ('new', 'confirmed', 'in_progress', 'completed', 'cancelled');
create type public.notification_status as enum ('pending', 'sent', 'failed', 'skipped');
create type public.admin_role as enum ('owner', 'admin', 'operator');

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.product_categories(id) on delete set null,
  slug text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  source_page text,
  source_key text,
  import_warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_categories_slug_key unique (slug),
  constraint product_categories_slug_not_blank check (length(trim(slug)) > 0),
  constraint product_categories_title_not_blank check (length(trim(title)) > 0),
  constraint product_categories_source_pair check ((source_page is null and source_key is null) or (source_page is not null and source_key is not null))
);

create unique index product_categories_source_unique
  on public.product_categories (source_page, source_key)
  where source_page is not null and source_key is not null;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  slug text not null,
  title text not null,
  short_description text,
  description text,
  status public.product_status not null default 'draft',
  visibility public.product_visibility not null default 'private',
  order_mode public.product_order_mode not null default 'disabled',
  requires_review boolean not null default true,
  base_price_cents integer,
  price_kind text not null default 'none',
  price_note text,
  currency char(3) not null default 'EUR',
  specs jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  source_page text,
  source_key text,
  import_warnings jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_key unique (slug),
  constraint products_slug_not_blank check (length(trim(slug)) > 0),
  constraint products_title_not_blank check (length(trim(title)) > 0),
  constraint products_base_price_nonnegative check (base_price_cents is null or base_price_cents >= 0),
  constraint products_price_kind_valid check (price_kind in ('none', 'fixed', 'from', 'request')),
  constraint products_currency_uppercase check (currency = upper(currency) and length(currency) = 3),
  constraint products_sort_order_nonnegative check (sort_order >= 0),
  constraint products_source_pair check ((source_page is null and source_key is null) or (source_page is not null and source_key is not null)),
  constraint products_priced_has_price check (order_mode <> 'priced' or base_price_cents is not null or price_kind = 'from')
);

create unique index products_source_unique
  on public.products (source_page, source_key)
  where source_page is not null and source_key is not null;
create index products_public_catalog_idx
  on public.products (status, visibility, order_mode, category_id, sort_order, published_at desc)
  where status = 'active' and visibility = 'public' and requires_review = false;
create index products_category_idx on public.products (category_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_bucket text not null default 'product-assets',
  storage_path text,
  url text not null,
  alt text,
  original_filename text,
  diagnostic_json_urls jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_images_url_not_blank check (length(trim(url)) > 0),
  constraint product_images_sort_nonnegative check (sort_order >= 0),
  constraint product_images_product_sort_unique unique (product_id, sort_order)
);

create unique index product_images_one_primary_per_product
  on public.product_images (product_id)
  where is_primary;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text,
  title text not null,
  price_cents integer,
  specs jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_title_not_blank check (length(trim(title)) > 0),
  constraint product_variants_price_nonnegative check (price_cents is null or price_cents >= 0),
  constraint product_variants_sort_nonnegative check (sort_order >= 0)
);

create unique index product_variants_product_sku_unique
  on public.product_variants (product_id, sku)
  where sku is not null;

create table public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  slug text not null,
  title text not null,
  selection_required boolean not null default false,
  min_selections integer not null default 0,
  max_selections integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_option_groups_slug_not_blank check (length(trim(slug)) > 0),
  constraint product_option_groups_title_not_blank check (length(trim(title)) > 0),
  constraint product_option_groups_selection_bounds check (
    min_selections >= 0 and max_selections >= min_selections and (selection_required = false or min_selections >= 1)
  ),
  constraint product_option_groups_product_slug_unique unique (product_id, slug)
);

create table public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.product_option_groups(id) on delete cascade,
  slug text not null,
  title text not null,
  price_delta_cents integer not null default 0,
  specs jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_option_values_slug_not_blank check (length(trim(slug)) > 0),
  constraint product_option_values_title_not_blank check (length(trim(title)) > 0),
  constraint product_option_values_price_nonnegative check (price_delta_cents >= 0),
  constraint product_option_values_group_slug_unique unique (group_id, slug)
);

create table public.product_variant_option_prices (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  option_value_id uuid not null references public.product_option_values(id) on delete cascade,
  price_delta_cents integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variant_option_prices_delta_nonnegative check (price_delta_cents >= 0),
  constraint product_variant_option_prices_unique unique (variant_id, option_value_id)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  color_hex text,
  image_url text,
  source_page text,
  source_key text,
  import_warnings jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materials_slug_key unique (slug),
  constraint materials_slug_not_blank check (length(trim(slug)) > 0),
  constraint materials_title_not_blank check (length(trim(title)) > 0),
  constraint materials_color_hex_valid check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  constraint materials_source_pair check ((source_page is null and source_key is null) or (source_page is not null and source_key is not null))
);

create unique index materials_source_unique
  on public.materials (source_page, source_key)
  where source_page is not null and source_key is not null;

create table public.product_materials (
  product_id uuid not null references public.products(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  price_delta_cents integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (product_id, material_id),
  constraint product_materials_price_nonnegative check (price_delta_cents >= 0)
);

create unique index product_materials_one_default_per_product
  on public.product_materials (product_id)
  where is_default;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_full_name_not_blank check (length(trim(full_name)) > 0),
  constraint customers_phone_not_blank check (length(trim(phone)) > 0),
  constraint customers_phone_key unique (phone)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_sequence bigint generated always as identity unique,
  order_reference text generated always as ('NEB-' || lpad(order_sequence::text, 6, '0')) stored unique,
  customer_id uuid references public.customers(id) on delete set null,
  status public.order_status not null default 'new',
  notification_status public.notification_status not null default 'pending',
  subtotal_cents integer not null default 0,
  total_cents integer not null default 0,
  currency char(3) not null default 'EUR',
  customer_note text,
  internal_note text,
  idempotency_key text,
  request_context jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_subtotal_nonnegative check (subtotal_cents >= 0),
  constraint orders_total_nonnegative check (total_cents >= 0),
  constraint orders_currency_uppercase check (currency = upper(currency) and length(currency) = 3),
  constraint orders_idempotency_key_unique unique (idempotency_key)
);

create index orders_customer_idx on public.orders (customer_id);
create index orders_status_created_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_snapshot jsonb not null,
  variant_snapshot jsonb,
  material_snapshot jsonb,
  unit_price_cents integer not null,
  quantity integer not null,
  line_total_cents integer not null,
  currency char(3) not null default 'EUR',
  created_at timestamptz not null default now(),
  constraint order_items_unit_price_nonnegative check (unit_price_cents >= 0),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_line_total_nonnegative check (line_total_cents >= 0),
  constraint order_items_currency_uppercase check (currency = upper(currency) and length(currency) = 3)
);

create table public.order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  option_group_snapshot jsonb not null,
  option_value_snapshot jsonb not null,
  price_delta_cents integer not null default 0,
  created_at timestamptz not null default now(),
  constraint order_item_options_delta_nonnegative check (price_delta_cents >= 0)
);

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.checkout_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  channel text not null default 'whatsapp',
  status public.notification_status not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkout_notifications_attempts_nonnegative check (attempt_count >= 0),
  constraint checkout_notifications_channel_not_blank check (length(trim(channel)) > 0)
);

create table public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_templates_slug_key unique (slug),
  constraint whatsapp_templates_body_not_blank check (length(trim(body)) > 0)
);

create table public.whatsapp_events (
  id uuid primary key default gen_random_uuid(),
  direction text not null,
  event_type text not null,
  phone text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint whatsapp_events_direction_valid check (direction in ('inbound', 'outbound', 'status')),
  constraint whatsapp_events_type_not_blank check (length(trim(event_type)) > 0)
);

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_templates_slug_key unique (slug),
  constraint document_templates_body_not_blank check (length(trim(body)) > 0)
);

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  template_id uuid references public.document_templates(id) on delete set null,
  storage_bucket text not null default 'generated-documents',
  storage_path text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint generated_documents_storage_path_not_blank check (length(trim(storage_path)) > 0)
);

create table public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  role public.admin_role not null default 'operator',
  full_name text,
  is_active boolean not null default true,
  disabled_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_profiles_disabled_state check ((is_active and disabled_at is null) or (not is_active))
);

create table public.admin_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_settings_key_not_blank check (length(trim(key)) > 0)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_role public.admin_role,
  action text not null,
  entity_type text not null,
  entity_id text,
  request_context jsonb not null default '{}'::jsonb,
  before_summary jsonb,
  after_summary jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_not_blank check (length(trim(action)) > 0),
  constraint audit_logs_entity_type_not_blank check (length(trim(entity_type)) > 0)
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

create function public.prevent_last_owner_disable()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'owner'
    and (new.role <> 'owner' or new.is_active = false)
    and (
      select count(*)
      from public.admin_profiles
      where role = 'owner'
        and is_active = true
        and id <> old.id
    ) = 0
  then
    raise exception 'Cannot remove or disable the last active owner';
  end if;

  return new;
end;
$$;

create trigger set_product_categories_updated_at before update on public.product_categories
  for each row execute function public.set_updated_at();
create trigger set_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger set_product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger set_product_option_groups_updated_at before update on public.product_option_groups
  for each row execute function public.set_updated_at();
create trigger set_product_option_values_updated_at before update on public.product_option_values
  for each row execute function public.set_updated_at();
create trigger set_product_variant_option_prices_updated_at before update on public.product_variant_option_prices
  for each row execute function public.set_updated_at();
create trigger set_materials_updated_at before update on public.materials
  for each row execute function public.set_updated_at();
create trigger set_customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger set_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger set_checkout_notifications_updated_at before update on public.checkout_notifications
  for each row execute function public.set_updated_at();
create trigger set_whatsapp_templates_updated_at before update on public.whatsapp_templates
  for each row execute function public.set_updated_at();
create trigger set_document_templates_updated_at before update on public.document_templates
  for each row execute function public.set_updated_at();
create trigger set_admin_settings_updated_at before update on public.admin_settings
  for each row execute function public.set_updated_at();
create trigger set_admin_profiles_updated_at before update on public.admin_profiles
  for each row execute function public.set_updated_at();
create trigger prevent_audit_log_update before update or delete on public.audit_logs
  for each row execute function public.prevent_mutation();
create trigger prevent_order_status_event_update before update or delete on public.order_status_events
  for each row execute function public.prevent_mutation();
create trigger prevent_last_owner_disable before update on public.admin_profiles
  for each row execute function public.prevent_last_owner_disable();

create function public.active_admin_role(user_id uuid default auth.uid())
returns public.admin_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.admin_profiles
  where admin_profiles.user_id = active_admin_role.user_id
    and is_active = true
  limit 1
$$;

create function public.is_active_admin(required_roles public.admin_role[] default array['owner', 'admin', 'operator']::public.admin_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.active_admin_role(auth.uid()) = any(required_roles), false)
$$;

create function public.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = public
as $$
  select public.active_admin_role(auth.uid())
$$;

create function public.bootstrap_first_owner(p_user_id uuid, p_full_name text default null)
returns public.admin_role
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'First owner bootstrap must be called by the authenticated user';
  end if;

  if exists (select 1 from public.admin_profiles) then
    raise exception 'Admin bootstrap is already complete';
  end if;

  insert into public.admin_profiles (user_id, role, full_name, is_active)
  values (p_user_id, 'owner', nullif(trim(p_full_name), ''), true);

  return 'owner'::public.admin_role;
end;
$$;

alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_option_groups enable row level security;
alter table public.product_option_values enable row level security;
alter table public.product_variant_option_prices enable row level security;
alter table public.materials enable row level security;
alter table public.product_materials enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_options enable row level security;
alter table public.order_status_events enable row level security;
alter table public.checkout_notifications enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.whatsapp_events enable row level security;
alter table public.document_templates enable row level security;
alter table public.generated_documents enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.admin_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "public categories are readable" on public.product_categories
  for select to anon, authenticated
  using (is_active = true);
create policy "admins read all categories" on public.product_categories
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage categories" on public.product_categories
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "public products are readable" on public.products
  for select to anon, authenticated
  using (status = 'active' and visibility = 'public' and requires_review = false);
create policy "admins read all products" on public.products
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage products" on public.products
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "public product images are readable" on public.product_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.products
    where products.id = product_images.product_id
      and products.status = 'active'
      and products.visibility = 'public'
      and products.requires_review = false
  ));
create policy "admins read all product images" on public.product_images
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage product images" on public.product_images
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "public variants are readable" on public.product_variants
  for select to anon, authenticated
  using (is_active = true and exists (
    select 1 from public.products
    where products.id = product_variants.product_id
      and products.status = 'active'
      and products.visibility = 'public'
      and products.requires_review = false
  ));
create policy "admins read all variants" on public.product_variants
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage variants" on public.product_variants
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "public option groups are readable" on public.product_option_groups
  for select to anon, authenticated
  using (exists (
    select 1 from public.products
    where products.id = product_option_groups.product_id
      and products.status = 'active'
      and products.visibility = 'public'
      and products.requires_review = false
  ));
create policy "admins read all option groups" on public.product_option_groups
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage option groups" on public.product_option_groups
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "public option values are readable" on public.product_option_values
  for select to anon, authenticated
  using (is_active = true and exists (
    select 1
    from public.product_option_groups g
    join public.products p on p.id = g.product_id
    where g.id = product_option_values.group_id
      and p.status = 'active'
      and p.visibility = 'public'
      and p.requires_review = false
  ));
create policy "admins read all option values" on public.product_option_values
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage option values" on public.product_option_values
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "public variant option prices are readable" on public.product_variant_option_prices
  for select to anon, authenticated
  using (exists (
    select 1
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = product_variant_option_prices.variant_id
      and v.is_active = true
      and p.status = 'active'
      and p.visibility = 'public'
      and p.requires_review = false
  ));
create policy "admins read all variant option prices" on public.product_variant_option_prices
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage variant option prices" on public.product_variant_option_prices
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "public materials are readable" on public.materials
  for select to anon, authenticated
  using (is_active = true);
create policy "admins read all materials" on public.materials
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage materials" on public.materials
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "public product materials are readable" on public.product_materials
  for select to anon, authenticated
  using (exists (
    select 1
    from public.products p
    join public.materials m on m.id = product_materials.material_id
    where p.id = product_materials.product_id
      and p.status = 'active'
      and p.visibility = 'public'
      and p.requires_review = false
      and m.is_active = true
  ));
create policy "admins read all product materials" on public.product_materials
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage product materials" on public.product_materials
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "admins read customers" on public.customers
  for select to authenticated
  using (public.is_active_admin());
create policy "admins manage customers" on public.customers
  for all to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "admins read orders" on public.orders
  for select to authenticated
  using (public.is_active_admin());
create policy "admins manage orders" on public.orders
  for all to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "admins read order items" on public.order_items
  for select to authenticated
  using (public.is_active_admin());
create policy "admins manage order items" on public.order_items
  for all to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "admins read order item options" on public.order_item_options
  for select to authenticated
  using (public.is_active_admin());
create policy "admins manage order item options" on public.order_item_options
  for all to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "admins read order status events" on public.order_status_events
  for select to authenticated
  using (public.is_active_admin());
create policy "admins append order status events" on public.order_status_events
  for insert to authenticated
  with check (public.is_active_admin());

create policy "admins read checkout notifications" on public.checkout_notifications
  for select to authenticated
  using (public.is_active_admin());
create policy "admins manage checkout notifications" on public.checkout_notifications
  for all to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "admins read whatsapp templates" on public.whatsapp_templates
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage whatsapp templates" on public.whatsapp_templates
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "admins read whatsapp events" on public.whatsapp_events
  for select to authenticated
  using (public.is_active_admin());
create policy "admins append whatsapp events" on public.whatsapp_events
  for insert to authenticated
  with check (public.is_active_admin());

create policy "admins read document templates" on public.document_templates
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage document templates" on public.document_templates
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "admins read generated documents" on public.generated_documents
  for select to authenticated
  using (public.is_active_admin());
create policy "admins manage generated documents" on public.generated_documents
  for all to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "admins read own profile" on public.admin_profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_active_admin());
create policy "owners manage admin profiles" on public.admin_profiles
  for all to authenticated
  using (public.is_active_admin(array['owner']::public.admin_role[]))
  with check (public.is_active_admin(array['owner']::public.admin_role[]));

create policy "admins read settings" on public.admin_settings
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage settings" on public.admin_settings
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

create policy "admins read audit logs" on public.audit_logs
  for select to authenticated
  using (public.is_active_admin());
create policy "admins append audit logs" on public.audit_logs
  for insert to authenticated
  with check (public.is_active_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-assets', 'product-assets', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('generated-documents', 'generated-documents', false, 10485760, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('admin-files', 'admin-files', false, 10485760, null)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "public product assets are readable" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-assets');
create policy "owners and admins upload product assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-assets' and public.is_active_admin(array['owner', 'admin']::public.admin_role[]));
create policy "owners and admins update product assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-assets' and public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (bucket_id = 'product-assets' and public.is_active_admin(array['owner', 'admin']::public.admin_role[]));
create policy "owners and admins delete product assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-assets' and public.is_active_admin(array['owner', 'admin']::public.admin_role[]));
create policy "admins read private files" on storage.objects
  for select to authenticated
  using (bucket_id in ('generated-documents', 'admin-files') and public.is_active_admin());
create policy "admins write private files" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('generated-documents', 'admin-files') and public.is_active_admin());
create policy "admins update private files" on storage.objects
  for update to authenticated
  using (bucket_id in ('generated-documents', 'admin-files') and public.is_active_admin())
  with check (bucket_id in ('generated-documents', 'admin-files') and public.is_active_admin());
create policy "admins delete private files" on storage.objects
  for delete to authenticated
  using (bucket_id in ('generated-documents', 'admin-files') and public.is_active_admin());

create function public.create_checkout_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idempotency_key text := nullif(trim(p_payload->>'idempotency_key'), '');
  v_existing public.orders%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_reference text;
  v_order_total integer := 0;
  v_item jsonb;
  v_option jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_material public.materials%rowtype;
  v_product_id uuid;
  v_variant_id uuid;
  v_material_id uuid;
  v_order_item_id uuid;
  v_quantity integer;
  v_unit_price integer;
  v_line_total integer;
  v_selected_options jsonb;
  v_option_delta integer;
  v_option_snapshot jsonb;
  v_primary_image text;
  v_missing_group record;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Checkout payload must be an object';
  end if;

  if v_idempotency_key is not null then
    select * into v_existing
    from public.orders
    where idempotency_key = v_idempotency_key;

    if found then
      return jsonb_build_object(
        'order_id', v_existing.id,
        'order_reference', v_existing.order_reference,
        'total_cents', v_existing.total_cents,
        'currency', v_existing.currency,
        'reused', true
      );
    end if;
  end if;

  if jsonb_typeof(p_payload->'items') <> 'array' or jsonb_array_length(p_payload->'items') = 0 then
    raise exception 'Checkout requires at least one item';
  end if;

  if jsonb_array_length(p_payload->'items') > 50 then
    raise exception 'Checkout item limit exceeded';
  end if;

  if nullif(trim(p_payload #>> '{customer,full_name}'), '') is null
    or nullif(trim(p_payload #>> '{customer,phone}'), '') is null
  then
    raise exception 'Customer name and phone are required';
  end if;

  insert into public.customers (full_name, phone, email, address, metadata)
  values (
    trim(p_payload #>> '{customer,full_name}'),
    trim(p_payload #>> '{customer,phone}'),
    nullif(trim(p_payload #>> '{customer,email}'), ''),
    nullif(trim(p_payload #>> '{customer,address}'), ''),
    coalesce(p_payload->'customer'->'metadata', '{}'::jsonb)
  )
  on conflict (phone) do update
  set full_name = excluded.full_name,
      email = coalesce(excluded.email, public.customers.email),
      address = coalesce(excluded.address, public.customers.address),
      updated_at = now()
  returning id into v_customer_id;

  insert into public.orders (
    customer_id,
    subtotal_cents,
    total_cents,
    currency,
    customer_note,
    idempotency_key,
    request_context,
    metadata
  )
  values (
    v_customer_id,
    0,
    0,
    'EUR',
    nullif(trim(p_payload->>'customer_note'), ''),
    v_idempotency_key,
    coalesce(p_payload->'request_context', '{}'::jsonb),
    coalesce(p_payload->'metadata', '{}'::jsonb)
  )
  returning id, order_reference into v_order_id, v_order_reference;

  for v_item in select value from jsonb_array_elements(p_payload->'items')
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    v_material_id := nullif(v_item->>'material_id', '')::uuid;
    v_quantity := coalesce((v_item->>'quantity')::integer, 1);

    if v_quantity < 1 or v_quantity > 20 then
      raise exception 'Invalid quantity';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id
      and status = 'active'
      and visibility = 'public'
      and requires_review = false
      and order_mode = 'priced';

    if not found then
      raise exception 'Product is not available for priced checkout';
    end if;

    v_variant := null;
    if v_variant_id is not null then
      select * into v_variant
      from public.product_variants
      where id = v_variant_id
        and product_id = v_product_id
        and is_active = true;

      if not found then
        raise exception 'Variant is not available for this product';
      end if;
    end if;

    v_unit_price := coalesce(v_variant.price_cents, v_product.base_price_cents);
    if v_unit_price is null then
      raise exception 'Product has no checkout price';
    end if;

    if v_material_id is not null then
      select m.* into v_material
      from public.materials m
      join public.product_materials pm on pm.material_id = m.id
      where pm.product_id = v_product_id
        and m.id = v_material_id
        and m.is_active = true;

      if not found then
        raise exception 'Material is not available for this product';
      end if;

      select v_unit_price + pm.price_delta_cents into v_unit_price
      from public.product_materials pm
      where pm.product_id = v_product_id
        and pm.material_id = v_material_id;
    else
      v_material := null;
    end if;

    v_selected_options := '[]'::jsonb;
    v_line_total := v_unit_price;

    if v_item ? 'options' then
      if jsonb_typeof(v_item->'options') <> 'array' then
        raise exception 'Item options must be an array';
      end if;

      for v_option in select value from jsonb_array_elements(v_item->'options')
      loop
        select coalesce(vop.price_delta_cents, ov.price_delta_cents), jsonb_build_object(
          'group', jsonb_build_object('id', g.id, 'slug', g.slug, 'title', g.title),
          'value', jsonb_build_object('id', ov.id, 'slug', ov.slug, 'title', ov.title, 'specs', ov.specs)
        )
        into v_option_delta, v_option_snapshot
        from public.product_option_values ov
        join public.product_option_groups g on g.id = ov.group_id
        left join public.product_variant_option_prices vop
          on vop.option_value_id = ov.id
          and vop.variant_id = v_variant_id
        where ov.id = (v_option->>'value_id')::uuid
          and g.id = (v_option->>'group_id')::uuid
          and g.product_id = v_product_id
          and ov.is_active = true;

        if not found then
          raise exception 'Selected option is not available for this product';
        end if;

        v_line_total := v_line_total + v_option_delta;
        v_selected_options := v_selected_options || jsonb_build_array(
          v_option_snapshot || jsonb_build_object('price_delta_cents', v_option_delta)
        );
      end loop;
    end if;

    for v_missing_group in
      select g.id, g.title, g.min_selections, g.max_selections,
        (
          select count(*)
          from jsonb_array_elements(coalesce(v_item->'options', '[]'::jsonb)) selected
          where (selected.value->>'group_id')::uuid = g.id
        ) as selected_count
      from public.product_option_groups g
      where g.product_id = v_product_id
    loop
      if v_missing_group.selected_count < v_missing_group.min_selections
        or v_missing_group.selected_count > v_missing_group.max_selections
      then
        raise exception 'Invalid option selection for group %', v_missing_group.title;
      end if;
    end loop;

    select url into v_primary_image
    from public.product_images
    where product_id = v_product_id
    order by is_primary desc, sort_order asc
    limit 1;

    v_line_total := v_line_total * v_quantity;
    v_order_total := v_order_total + v_line_total;

    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      product_snapshot,
      variant_snapshot,
      material_snapshot,
      unit_price_cents,
      quantity,
      line_total_cents,
      currency
    )
    values (
      v_order_id,
      v_product_id,
      v_variant_id,
      jsonb_build_object(
        'id', v_product.id,
        'category_id', v_product.category_id,
        'title', v_product.title,
        'slug', v_product.slug,
        'source_page', v_product.source_page,
        'source_key', v_product.source_key,
        'image', v_primary_image,
        'price_note', v_product.price_note,
        'specs', v_product.specs
      ),
      case when v_variant_id is null then null else jsonb_build_object(
        'id', v_variant.id,
        'sku', v_variant.sku,
        'title', v_variant.title,
        'specs', v_variant.specs
      ) end,
      case when v_material_id is null then null else jsonb_build_object(
        'id', v_material.id,
        'slug', v_material.slug,
        'title', v_material.title
      ) end,
      v_line_total / v_quantity,
      v_quantity,
      v_line_total,
      v_product.currency
    )
    returning id into v_order_item_id;

    insert into public.order_item_options (order_item_id, option_group_snapshot, option_value_snapshot, price_delta_cents)
    select
      v_order_item_id,
      selected.value->'group',
      selected.value->'value',
      (selected.value->>'price_delta_cents')::integer
    from jsonb_array_elements(v_selected_options) selected;
  end loop;

  update public.orders
  set subtotal_cents = v_order_total,
      total_cents = v_order_total,
      updated_at = now()
  where id = v_order_id;

  insert into public.order_status_events (order_id, status, note)
  values (v_order_id, 'new', 'Order created from checkout');

  insert into public.checkout_notifications (order_id, channel, status, payload)
  values (
    v_order_id,
    'whatsapp',
    'pending',
    jsonb_build_object('order_id', v_order_id, 'order_reference', v_order_reference)
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_reference', v_order_reference,
    'total_cents', v_order_total,
    'currency', 'EUR',
    'reused', false
  );
end;
$$;

revoke all on function public.create_checkout_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb) to service_role;
grant execute on function public.active_admin_role(uuid) to anon, authenticated, service_role;
grant execute on function public.is_active_admin(public.admin_role[]) to anon, authenticated, service_role;
grant execute on function public.current_admin_role() to anon, authenticated, service_role;
revoke all on function public.bootstrap_first_owner(uuid, text) from public, anon;
grant execute on function public.bootstrap_first_owner(uuid, text) to authenticated, service_role;

commit;
