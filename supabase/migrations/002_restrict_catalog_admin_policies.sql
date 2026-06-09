drop policy if exists "admins manage categories" on public.product_categories;
drop policy if exists "admins read all categories" on public.product_categories;
drop policy if exists "owners and admins manage categories" on public.product_categories;
create policy "admins read all categories" on public.product_categories
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage categories" on public.product_categories
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage products" on public.products;
drop policy if exists "admins read all products" on public.products;
drop policy if exists "owners and admins manage products" on public.products;
create policy "admins read all products" on public.products
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage products" on public.products
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage product images" on public.product_images;
drop policy if exists "admins read all product images" on public.product_images;
drop policy if exists "owners and admins manage product images" on public.product_images;
create policy "admins read all product images" on public.product_images
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage product images" on public.product_images
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage variants" on public.product_variants;
drop policy if exists "admins read all variants" on public.product_variants;
drop policy if exists "owners and admins manage variants" on public.product_variants;
create policy "admins read all variants" on public.product_variants
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage variants" on public.product_variants
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage option groups" on public.product_option_groups;
drop policy if exists "admins read all option groups" on public.product_option_groups;
drop policy if exists "owners and admins manage option groups" on public.product_option_groups;
create policy "admins read all option groups" on public.product_option_groups
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage option groups" on public.product_option_groups
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage option values" on public.product_option_values;
drop policy if exists "admins read all option values" on public.product_option_values;
drop policy if exists "owners and admins manage option values" on public.product_option_values;
create policy "admins read all option values" on public.product_option_values
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage option values" on public.product_option_values
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage variant option prices" on public.product_variant_option_prices;
drop policy if exists "admins read all variant option prices" on public.product_variant_option_prices;
drop policy if exists "owners and admins manage variant option prices" on public.product_variant_option_prices;
create policy "admins read all variant option prices" on public.product_variant_option_prices
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage variant option prices" on public.product_variant_option_prices
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage materials" on public.materials;
drop policy if exists "admins read all materials" on public.materials;
drop policy if exists "owners and admins manage materials" on public.materials;
create policy "admins read all materials" on public.materials
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage materials" on public.materials
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage product materials" on public.product_materials;
drop policy if exists "admins read all product materials" on public.product_materials;
drop policy if exists "owners and admins manage product materials" on public.product_materials;
create policy "admins read all product materials" on public.product_materials
  for select to authenticated
  using (public.is_active_admin());
create policy "owners and admins manage product materials" on public.product_materials
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));
