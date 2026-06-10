create or replace function public.create_checkout_order(p_payload jsonb)
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
  v_previous_stock integer;
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

  begin
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
  exception
    when unique_violation then
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

      raise;
  end;

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
      and order_mode in ('priced', 'inquiry_only')
    for update;

    if not found then
      raise exception 'Product is not available for checkout';
    end if;

    if v_product.availability_status = 'out_of_stock' then
      raise exception 'Product is out of stock';
    end if;

    if v_product.order_mode = 'priced' and v_product.track_inventory then
      v_previous_stock := v_product.stock_quantity;

      if v_product.allow_backorder then
        update public.products
        set stock_quantity = greatest(stock_quantity - v_quantity, 0),
            updated_at = now()
        where id = v_product_id
        returning * into v_product;
      else
        update public.products
        set stock_quantity = stock_quantity - v_quantity,
            availability_status = case
              when stock_quantity - v_quantity <= 0 then 'out_of_stock'
              else availability_status
            end,
            updated_at = now()
        where id = v_product_id
          and stock_quantity >= v_quantity
        returning * into v_product;

        if not found then
          raise exception 'Insufficient stock for product';
        end if;
      end if;

      insert into public.product_stock_movements (
        product_id,
        order_id,
        delta,
        resulting_quantity,
        reason,
        note
      )
      values (
        v_product_id,
        v_order_id,
        v_product.stock_quantity - v_previous_stock,
        v_product.stock_quantity,
        'checkout_order',
        v_order_reference
      );
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

    if v_product.order_mode = 'priced' then
      v_unit_price := coalesce(v_variant.price_cents, v_product.base_price_cents);
      if v_unit_price is null then
        raise exception 'Product has no checkout price';
      end if;
    else
      v_unit_price := 0;
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

      if v_product.order_mode = 'priced' then
        select v_unit_price + pm.price_delta_cents into v_unit_price
        from public.product_materials pm
        where pm.product_id = v_product_id
          and pm.material_id = v_material_id;
      end if;
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

        if v_product.order_mode = 'priced' then
          v_line_total := v_line_total + v_option_delta;
        else
          v_option_delta := 0;
        end if;
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
        'order_mode', v_product.order_mode,
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
  values
    (
      v_order_id,
      'whatsapp',
      'pending',
      jsonb_build_object('order_id', v_order_id, 'order_reference', v_order_reference)
    ),
    (
      v_order_id,
      'email',
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
