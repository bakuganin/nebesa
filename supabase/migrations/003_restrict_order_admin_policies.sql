drop policy if exists "admins manage customers" on public.customers;
drop policy if exists "owners and admins manage customers" on public.customers;
create policy "owners and admins manage customers" on public.customers
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage orders" on public.orders;
drop policy if exists "owners and admins manage orders" on public.orders;
create policy "owners and admins manage orders" on public.orders
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage order items" on public.order_items;
drop policy if exists "owners and admins manage order items" on public.order_items;
create policy "owners and admins manage order items" on public.order_items
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage order item options" on public.order_item_options;
drop policy if exists "owners and admins manage order item options" on public.order_item_options;
create policy "owners and admins manage order item options" on public.order_item_options
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins append order status events" on public.order_status_events;
drop policy if exists "owners and admins append order status events" on public.order_status_events;
create policy "owners and admins append order status events" on public.order_status_events
  for insert to authenticated
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage checkout notifications" on public.checkout_notifications;
drop policy if exists "owners and admins manage checkout notifications" on public.checkout_notifications;
create policy "owners and admins manage checkout notifications" on public.checkout_notifications
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins append whatsapp events" on public.whatsapp_events;
drop policy if exists "owners and admins append whatsapp events" on public.whatsapp_events;
create policy "owners and admins append whatsapp events" on public.whatsapp_events
  for insert to authenticated
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins manage generated documents" on public.generated_documents;
drop policy if exists "owners and admins manage generated documents" on public.generated_documents;
create policy "owners and admins manage generated documents" on public.generated_documents
  for all to authenticated
  using (public.is_active_admin(array['owner', 'admin']::public.admin_role[]))
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins append audit logs" on public.audit_logs;
drop policy if exists "owners and admins append audit logs" on public.audit_logs;
create policy "owners and admins append audit logs" on public.audit_logs
  for insert to authenticated
  with check (public.is_active_admin(array['owner', 'admin']::public.admin_role[]));

drop policy if exists "admins read own profile" on public.admin_profiles;
drop policy if exists "owners read admin profiles" on public.admin_profiles;
create policy "admins read own profile" on public.admin_profiles
  for select to authenticated
  using (user_id = auth.uid());
create policy "owners read admin profiles" on public.admin_profiles
  for select to authenticated
  using (public.is_active_admin(array['owner']::public.admin_role[]));

drop policy if exists "admins write private files" on storage.objects;
drop policy if exists "owners and admins write private files" on storage.objects;
create policy "owners and admins write private files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('generated-documents', 'admin-files')
    and public.is_active_admin(array['owner', 'admin']::public.admin_role[])
  );

drop policy if exists "admins update private files" on storage.objects;
drop policy if exists "owners and admins update private files" on storage.objects;
create policy "owners and admins update private files" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('generated-documents', 'admin-files')
    and public.is_active_admin(array['owner', 'admin']::public.admin_role[])
  )
  with check (
    bucket_id in ('generated-documents', 'admin-files')
    and public.is_active_admin(array['owner', 'admin']::public.admin_role[])
  );

drop policy if exists "admins delete private files" on storage.objects;
drop policy if exists "owners and admins delete private files" on storage.objects;
create policy "owners and admins delete private files" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('generated-documents', 'admin-files')
    and public.is_active_admin(array['owner', 'admin']::public.admin_role[])
  );
