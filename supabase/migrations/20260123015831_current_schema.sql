drop extension if exists "pg_net";


  create table "public"."brands" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null
      );



  create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null
      );



  create table "public"."inventory" (
    "id" uuid not null default gen_random_uuid(),
    "product_option_id" uuid,
    "warehouse_id" uuid,
    "quantity" numeric,
    "updated_at" timestamp without time zone default now()
      );



  create table "public"."inventory_batches" (
    "id" uuid not null default gen_random_uuid(),
    "product_option_id" uuid,
    "warehouse_id" uuid,
    "expiration_date" date,
    "quantity" numeric,
    "unit_price" integer,
    "lot_no" text,
    "memo" text,
    "created_at" timestamp without time zone default now()
      );



  create table "public"."product_options" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid,
    "sku" text,
    "weight" integer,
    "unit_label" text,
    "buy_price" integer,
    "sell_price" integer,
    "created_at" timestamp without time zone default now(),
    "updated_at" timestamp without time zone default now(),
    "box_unit" integer
      );



  create table "public"."products" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "category_id" uuid,
    "brand_id" uuid,
    "image_url" text,
    "created_at" timestamp without time zone default now(),
    "updated_at" timestamp without time zone default now(),
    "product_type" text default 'company'::text
      );



  create table "public"."profiles" (
    "id" uuid not null,
    "name" text,
    "image_url" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "email" text
      );



  create table "public"."push_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "endpoint" text not null,
    "p256dh_key" text not null,
    "auth_key" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "device_id" text,
    "device_name" text,
    "user_agent" text,
    "platform" text
      );



  create table "public"."suppliers" (
    "id" uuid not null default gen_random_uuid(),
    "name" text,
    "contact" text,
    "address" text,
    "created_at" timestamp without time zone default now()
      );



  create table "public"."transaction_items" (
    "id" uuid not null default gen_random_uuid(),
    "transaction_id" uuid,
    "product_option_id" uuid,
    "batch_id" uuid,
    "quantity" numeric,
    "unit_price" integer
      );



  create table "public"."transactions" (
    "id" uuid not null default gen_random_uuid(),
    "type" text,
    "user_id" uuid,
    "supplier_id" uuid,
    "from_warehouse_id" uuid,
    "to_warehouse_id" uuid,
    "memo" text,
    "created_at" timestamp without time zone default now()
      );



  create table "public"."user_read_status" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "last_read_broadcast_id" integer not null default 0,
    "read_at" timestamp with time zone default now()
      );



  create table "public"."warehouses" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "created_at" timestamp without time zone default now()
      );


CREATE UNIQUE INDEX brands_pkey ON public.brands USING btree (id);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE INDEX idx_products_product_type ON public.products USING btree (product_type);

CREATE INDEX idx_push_subscriptions_device_id ON public.push_subscriptions USING btree (device_id);

CREATE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions USING btree (endpoint);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);

CREATE INDEX idx_user_read_status_broadcast_id ON public.user_read_status USING btree (last_read_broadcast_id);

CREATE INDEX idx_user_read_status_user_id ON public.user_read_status USING btree (user_id);

CREATE UNIQUE INDEX inventory_batches_pkey ON public.inventory_batches USING btree (id);

CREATE UNIQUE INDEX inventory_pkey ON public.inventory USING btree (id);

CREATE UNIQUE INDEX product_options_pkey ON public.product_options USING btree (id);

CREATE UNIQUE INDEX product_options_sku_key ON public.product_options USING btree (sku);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id);

CREATE UNIQUE INDEX push_subscriptions_user_endpoint_unique ON public.push_subscriptions USING btree (user_id, endpoint);

CREATE UNIQUE INDEX suppliers_pkey ON public.suppliers USING btree (id);

CREATE UNIQUE INDEX transaction_items_pkey ON public.transaction_items USING btree (id);

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

CREATE UNIQUE INDEX user_read_status_pkey ON public.user_read_status USING btree (id);

CREATE UNIQUE INDEX user_read_status_user_id_key ON public.user_read_status USING btree (user_id);

CREATE UNIQUE INDEX warehouses_pkey ON public.warehouses USING btree (id);

alter table "public"."brands" add constraint "brands_pkey" PRIMARY KEY using index "brands_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."inventory" add constraint "inventory_pkey" PRIMARY KEY using index "inventory_pkey";

alter table "public"."inventory_batches" add constraint "inventory_batches_pkey" PRIMARY KEY using index "inventory_batches_pkey";

alter table "public"."product_options" add constraint "product_options_pkey" PRIMARY KEY using index "product_options_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_pkey" PRIMARY KEY using index "push_subscriptions_pkey";

alter table "public"."suppliers" add constraint "suppliers_pkey" PRIMARY KEY using index "suppliers_pkey";

alter table "public"."transaction_items" add constraint "transaction_items_pkey" PRIMARY KEY using index "transaction_items_pkey";

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "public"."user_read_status" add constraint "user_read_status_pkey" PRIMARY KEY using index "user_read_status_pkey";

alter table "public"."warehouses" add constraint "warehouses_pkey" PRIMARY KEY using index "warehouses_pkey";

alter table "public"."inventory" add constraint "inventory_product_option_id_fkey" FOREIGN KEY (product_option_id) REFERENCES public.product_options(id) not valid;

alter table "public"."inventory" validate constraint "inventory_product_option_id_fkey";

alter table "public"."inventory" add constraint "inventory_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) not valid;

alter table "public"."inventory" validate constraint "inventory_warehouse_id_fkey";

alter table "public"."inventory_batches" add constraint "inventory_batches_product_option_id_fkey" FOREIGN KEY (product_option_id) REFERENCES public.product_options(id) not valid;

alter table "public"."inventory_batches" validate constraint "inventory_batches_product_option_id_fkey";

alter table "public"."inventory_batches" add constraint "inventory_batches_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) not valid;

alter table "public"."inventory_batches" validate constraint "inventory_batches_warehouse_id_fkey";

alter table "public"."product_options" add constraint "product_options_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."product_options" validate constraint "product_options_product_id_fkey";

alter table "public"."product_options" add constraint "product_options_sku_key" UNIQUE using index "product_options_sku_key";

alter table "public"."products" add constraint "products_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES public.brands(id) not valid;

alter table "public"."products" validate constraint "products_brand_id_fkey";

alter table "public"."products" add constraint "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) not valid;

alter table "public"."products" validate constraint "products_category_id_fkey";

alter table "public"."products" add constraint "products_product_type_check" CHECK ((product_type = ANY (ARRAY['company'::text, 'franchise'::text, 'pb'::text]))) not valid;

alter table "public"."products" validate constraint "products_product_type_check";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_user_endpoint_unique" UNIQUE using index "push_subscriptions_user_endpoint_unique";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."push_subscriptions" validate constraint "push_subscriptions_user_id_fkey";

alter table "public"."transaction_items" add constraint "transaction_items_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.inventory_batches(id) not valid;

alter table "public"."transaction_items" validate constraint "transaction_items_batch_id_fkey";

alter table "public"."transaction_items" add constraint "transaction_items_product_option_id_fkey" FOREIGN KEY (product_option_id) REFERENCES public.product_options(id) not valid;

alter table "public"."transaction_items" validate constraint "transaction_items_product_option_id_fkey";

alter table "public"."transaction_items" add constraint "transaction_items_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) not valid;

alter table "public"."transaction_items" validate constraint "transaction_items_transaction_id_fkey";

alter table "public"."transactions" add constraint "transactions_from_warehouse_id_fkey" FOREIGN KEY (from_warehouse_id) REFERENCES public.warehouses(id) not valid;

alter table "public"."transactions" validate constraint "transactions_from_warehouse_id_fkey";

alter table "public"."transactions" add constraint "transactions_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) not valid;

alter table "public"."transactions" validate constraint "transactions_supplier_id_fkey";

alter table "public"."transactions" add constraint "transactions_to_warehouse_id_fkey" FOREIGN KEY (to_warehouse_id) REFERENCES public.warehouses(id) not valid;

alter table "public"."transactions" validate constraint "transactions_to_warehouse_id_fkey";

alter table "public"."transactions" add constraint "transactions_type_check" CHECK ((type = ANY (ARRAY['in'::text, 'out'::text, 'move'::text, 'adjust'::text]))) not valid;

alter table "public"."transactions" validate constraint "transactions_type_check";

alter table "public"."user_read_status" add constraint "user_read_status_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_read_status" validate constraint "user_read_status_user_id_fkey";

alter table "public"."user_read_status" add constraint "user_read_status_user_id_key" UNIQUE using index "user_read_status_user_id_key";

create or replace view "public"."product_option_inventory_view" as  SELECT po.id AS product_option_id,
    po.sku,
    po.weight,
    po.unit_label,
    po.box_unit,
    po.buy_price,
    po.sell_price,
    p.id AS product_id,
    p.name AS product_name,
    b.name AS brand_name,
    c.name AS category_name,
    p.product_type,
    p.image_url,
    i.id AS inventory_id,
    COALESCE(i.quantity, (0)::numeric) AS quantity,
    w.id AS warehouse_id,
    w.name AS warehouse_name
   FROM (((((public.product_options po
     JOIN public.products p ON ((po.product_id = p.id)))
     LEFT JOIN public.brands b ON ((p.brand_id = b.id)))
     LEFT JOIN public.categories c ON ((p.category_id = c.id)))
     LEFT JOIN public.inventory i ON ((i.product_option_id = po.id)))
     LEFT JOIN public.warehouses w ON ((i.warehouse_id = w.id)));


create or replace view "public"."transaction_history_view" as  SELECT t.id AS transaction_id,
    t.type,
    t.created_at,
    t.memo,
    u.name AS user_name,
    s.name AS supplier_name,
    w1.name AS from_warehouse_name,
    w2.name AS to_warehouse_name,
    ti.product_option_id,
    p.name AS product_name,
    po.weight,
    po.unit_label,
    ti.quantity,
    ti.unit_price
   FROM (((((((public.transactions t
     JOIN public.transaction_items ti ON ((ti.transaction_id = t.id)))
     JOIN public.product_options po ON ((po.id = ti.product_option_id)))
     JOIN public.products p ON ((p.id = po.product_id)))
     LEFT JOIN public.profiles u ON ((u.id = t.user_id)))
     LEFT JOIN public.suppliers s ON ((s.id = t.supplier_id)))
     LEFT JOIN public.warehouses w1 ON ((w1.id = t.from_warehouse_id)))
     LEFT JOIN public.warehouses w2 ON ((w2.id = t.to_warehouse_id)))
  ORDER BY t.created_at DESC;


grant delete on table "public"."brands" to "anon";

grant insert on table "public"."brands" to "anon";

grant references on table "public"."brands" to "anon";

grant select on table "public"."brands" to "anon";

grant trigger on table "public"."brands" to "anon";

grant truncate on table "public"."brands" to "anon";

grant update on table "public"."brands" to "anon";

grant delete on table "public"."brands" to "authenticated";

grant insert on table "public"."brands" to "authenticated";

grant references on table "public"."brands" to "authenticated";

grant select on table "public"."brands" to "authenticated";

grant trigger on table "public"."brands" to "authenticated";

grant truncate on table "public"."brands" to "authenticated";

grant update on table "public"."brands" to "authenticated";

grant delete on table "public"."brands" to "service_role";

grant insert on table "public"."brands" to "service_role";

grant references on table "public"."brands" to "service_role";

grant select on table "public"."brands" to "service_role";

grant trigger on table "public"."brands" to "service_role";

grant truncate on table "public"."brands" to "service_role";

grant update on table "public"."brands" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."inventory" to "anon";

grant insert on table "public"."inventory" to "anon";

grant references on table "public"."inventory" to "anon";

grant select on table "public"."inventory" to "anon";

grant trigger on table "public"."inventory" to "anon";

grant truncate on table "public"."inventory" to "anon";

grant update on table "public"."inventory" to "anon";

grant delete on table "public"."inventory" to "authenticated";

grant insert on table "public"."inventory" to "authenticated";

grant references on table "public"."inventory" to "authenticated";

grant select on table "public"."inventory" to "authenticated";

grant trigger on table "public"."inventory" to "authenticated";

grant truncate on table "public"."inventory" to "authenticated";

grant update on table "public"."inventory" to "authenticated";

grant delete on table "public"."inventory" to "service_role";

grant insert on table "public"."inventory" to "service_role";

grant references on table "public"."inventory" to "service_role";

grant select on table "public"."inventory" to "service_role";

grant trigger on table "public"."inventory" to "service_role";

grant truncate on table "public"."inventory" to "service_role";

grant update on table "public"."inventory" to "service_role";

grant delete on table "public"."inventory_batches" to "anon";

grant insert on table "public"."inventory_batches" to "anon";

grant references on table "public"."inventory_batches" to "anon";

grant select on table "public"."inventory_batches" to "anon";

grant trigger on table "public"."inventory_batches" to "anon";

grant truncate on table "public"."inventory_batches" to "anon";

grant update on table "public"."inventory_batches" to "anon";

grant delete on table "public"."inventory_batches" to "authenticated";

grant insert on table "public"."inventory_batches" to "authenticated";

grant references on table "public"."inventory_batches" to "authenticated";

grant select on table "public"."inventory_batches" to "authenticated";

grant trigger on table "public"."inventory_batches" to "authenticated";

grant truncate on table "public"."inventory_batches" to "authenticated";

grant update on table "public"."inventory_batches" to "authenticated";

grant delete on table "public"."inventory_batches" to "service_role";

grant insert on table "public"."inventory_batches" to "service_role";

grant references on table "public"."inventory_batches" to "service_role";

grant select on table "public"."inventory_batches" to "service_role";

grant trigger on table "public"."inventory_batches" to "service_role";

grant truncate on table "public"."inventory_batches" to "service_role";

grant update on table "public"."inventory_batches" to "service_role";

grant delete on table "public"."product_options" to "anon";

grant insert on table "public"."product_options" to "anon";

grant references on table "public"."product_options" to "anon";

grant select on table "public"."product_options" to "anon";

grant trigger on table "public"."product_options" to "anon";

grant truncate on table "public"."product_options" to "anon";

grant update on table "public"."product_options" to "anon";

grant delete on table "public"."product_options" to "authenticated";

grant insert on table "public"."product_options" to "authenticated";

grant references on table "public"."product_options" to "authenticated";

grant select on table "public"."product_options" to "authenticated";

grant trigger on table "public"."product_options" to "authenticated";

grant truncate on table "public"."product_options" to "authenticated";

grant update on table "public"."product_options" to "authenticated";

grant delete on table "public"."product_options" to "service_role";

grant insert on table "public"."product_options" to "service_role";

grant references on table "public"."product_options" to "service_role";

grant select on table "public"."product_options" to "service_role";

grant trigger on table "public"."product_options" to "service_role";

grant truncate on table "public"."product_options" to "service_role";

grant update on table "public"."product_options" to "service_role";

grant delete on table "public"."products" to "anon";

grant insert on table "public"."products" to "anon";

grant references on table "public"."products" to "anon";

grant select on table "public"."products" to "anon";

grant trigger on table "public"."products" to "anon";

grant truncate on table "public"."products" to "anon";

grant update on table "public"."products" to "anon";

grant delete on table "public"."products" to "authenticated";

grant insert on table "public"."products" to "authenticated";

grant references on table "public"."products" to "authenticated";

grant select on table "public"."products" to "authenticated";

grant trigger on table "public"."products" to "authenticated";

grant truncate on table "public"."products" to "authenticated";

grant update on table "public"."products" to "authenticated";

grant delete on table "public"."products" to "service_role";

grant insert on table "public"."products" to "service_role";

grant references on table "public"."products" to "service_role";

grant select on table "public"."products" to "service_role";

grant trigger on table "public"."products" to "service_role";

grant truncate on table "public"."products" to "service_role";

grant update on table "public"."products" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."push_subscriptions" to "anon";

grant insert on table "public"."push_subscriptions" to "anon";

grant references on table "public"."push_subscriptions" to "anon";

grant select on table "public"."push_subscriptions" to "anon";

grant trigger on table "public"."push_subscriptions" to "anon";

grant truncate on table "public"."push_subscriptions" to "anon";

grant update on table "public"."push_subscriptions" to "anon";

grant delete on table "public"."push_subscriptions" to "authenticated";

grant insert on table "public"."push_subscriptions" to "authenticated";

grant references on table "public"."push_subscriptions" to "authenticated";

grant select on table "public"."push_subscriptions" to "authenticated";

grant trigger on table "public"."push_subscriptions" to "authenticated";

grant truncate on table "public"."push_subscriptions" to "authenticated";

grant update on table "public"."push_subscriptions" to "authenticated";

grant delete on table "public"."push_subscriptions" to "service_role";

grant insert on table "public"."push_subscriptions" to "service_role";

grant references on table "public"."push_subscriptions" to "service_role";

grant select on table "public"."push_subscriptions" to "service_role";

grant trigger on table "public"."push_subscriptions" to "service_role";

grant truncate on table "public"."push_subscriptions" to "service_role";

grant update on table "public"."push_subscriptions" to "service_role";

grant delete on table "public"."suppliers" to "anon";

grant insert on table "public"."suppliers" to "anon";

grant references on table "public"."suppliers" to "anon";

grant select on table "public"."suppliers" to "anon";

grant trigger on table "public"."suppliers" to "anon";

grant truncate on table "public"."suppliers" to "anon";

grant update on table "public"."suppliers" to "anon";

grant delete on table "public"."suppliers" to "authenticated";

grant insert on table "public"."suppliers" to "authenticated";

grant references on table "public"."suppliers" to "authenticated";

grant select on table "public"."suppliers" to "authenticated";

grant trigger on table "public"."suppliers" to "authenticated";

grant truncate on table "public"."suppliers" to "authenticated";

grant update on table "public"."suppliers" to "authenticated";

grant delete on table "public"."suppliers" to "service_role";

grant insert on table "public"."suppliers" to "service_role";

grant references on table "public"."suppliers" to "service_role";

grant select on table "public"."suppliers" to "service_role";

grant trigger on table "public"."suppliers" to "service_role";

grant truncate on table "public"."suppliers" to "service_role";

grant update on table "public"."suppliers" to "service_role";

grant delete on table "public"."transaction_items" to "anon";

grant insert on table "public"."transaction_items" to "anon";

grant references on table "public"."transaction_items" to "anon";

grant select on table "public"."transaction_items" to "anon";

grant trigger on table "public"."transaction_items" to "anon";

grant truncate on table "public"."transaction_items" to "anon";

grant update on table "public"."transaction_items" to "anon";

grant delete on table "public"."transaction_items" to "authenticated";

grant insert on table "public"."transaction_items" to "authenticated";

grant references on table "public"."transaction_items" to "authenticated";

grant select on table "public"."transaction_items" to "authenticated";

grant trigger on table "public"."transaction_items" to "authenticated";

grant truncate on table "public"."transaction_items" to "authenticated";

grant update on table "public"."transaction_items" to "authenticated";

grant delete on table "public"."transaction_items" to "service_role";

grant insert on table "public"."transaction_items" to "service_role";

grant references on table "public"."transaction_items" to "service_role";

grant select on table "public"."transaction_items" to "service_role";

grant trigger on table "public"."transaction_items" to "service_role";

grant truncate on table "public"."transaction_items" to "service_role";

grant update on table "public"."transaction_items" to "service_role";

grant delete on table "public"."transactions" to "anon";

grant insert on table "public"."transactions" to "anon";

grant references on table "public"."transactions" to "anon";

grant select on table "public"."transactions" to "anon";

grant trigger on table "public"."transactions" to "anon";

grant truncate on table "public"."transactions" to "anon";

grant update on table "public"."transactions" to "anon";

grant delete on table "public"."transactions" to "authenticated";

grant insert on table "public"."transactions" to "authenticated";

grant references on table "public"."transactions" to "authenticated";

grant select on table "public"."transactions" to "authenticated";

grant trigger on table "public"."transactions" to "authenticated";

grant truncate on table "public"."transactions" to "authenticated";

grant update on table "public"."transactions" to "authenticated";

grant delete on table "public"."transactions" to "service_role";

grant insert on table "public"."transactions" to "service_role";

grant references on table "public"."transactions" to "service_role";

grant select on table "public"."transactions" to "service_role";

grant trigger on table "public"."transactions" to "service_role";

grant truncate on table "public"."transactions" to "service_role";

grant update on table "public"."transactions" to "service_role";

grant delete on table "public"."user_read_status" to "anon";

grant insert on table "public"."user_read_status" to "anon";

grant references on table "public"."user_read_status" to "anon";

grant select on table "public"."user_read_status" to "anon";

grant trigger on table "public"."user_read_status" to "anon";

grant truncate on table "public"."user_read_status" to "anon";

grant update on table "public"."user_read_status" to "anon";

grant delete on table "public"."user_read_status" to "authenticated";

grant insert on table "public"."user_read_status" to "authenticated";

grant references on table "public"."user_read_status" to "authenticated";

grant select on table "public"."user_read_status" to "authenticated";

grant trigger on table "public"."user_read_status" to "authenticated";

grant truncate on table "public"."user_read_status" to "authenticated";

grant update on table "public"."user_read_status" to "authenticated";

grant delete on table "public"."user_read_status" to "service_role";

grant insert on table "public"."user_read_status" to "service_role";

grant references on table "public"."user_read_status" to "service_role";

grant select on table "public"."user_read_status" to "service_role";

grant trigger on table "public"."user_read_status" to "service_role";

grant truncate on table "public"."user_read_status" to "service_role";

grant update on table "public"."user_read_status" to "service_role";

grant delete on table "public"."warehouses" to "anon";

grant insert on table "public"."warehouses" to "anon";

grant references on table "public"."warehouses" to "anon";

grant select on table "public"."warehouses" to "anon";

grant trigger on table "public"."warehouses" to "anon";

grant truncate on table "public"."warehouses" to "anon";

grant update on table "public"."warehouses" to "anon";

grant delete on table "public"."warehouses" to "authenticated";

grant insert on table "public"."warehouses" to "authenticated";

grant references on table "public"."warehouses" to "authenticated";

grant select on table "public"."warehouses" to "authenticated";

grant trigger on table "public"."warehouses" to "authenticated";

grant truncate on table "public"."warehouses" to "authenticated";

grant update on table "public"."warehouses" to "authenticated";

grant delete on table "public"."warehouses" to "service_role";

grant insert on table "public"."warehouses" to "service_role";

grant references on table "public"."warehouses" to "service_role";

grant select on table "public"."warehouses" to "service_role";

grant trigger on table "public"."warehouses" to "service_role";

grant truncate on table "public"."warehouses" to "service_role";

grant update on table "public"."warehouses" to "service_role";


  create policy "image 1nq2cb_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'image'::text));



  create policy "image 1nq2cb_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'image'::text));



  create policy "image 1nq2cb_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'image'::text));



  create policy "image 1nq2cb_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'image'::text));



