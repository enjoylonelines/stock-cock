-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create locations table
create table locations (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create suppliers table
create table suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  contact text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create products table
create table products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  sell_price numeric not null,
  buy_price numeric not null,
  category text not null,
  brand text not null,
  stock numeric not null default 0,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create receipts table
create table receipts (
  id uuid default uuid_generate_v4() primary key,
  type text not null check (type in ('IN', 'OUT')),
  location_id uuid references locations(id) not null,
  supplier_id uuid references suppliers(id) not null,
  memo text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'COMPLETED')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create receipt_items table
create table receipt_items (
  id uuid default uuid_generate_v4() primary key,
  receipt_id uuid references receipts(id) not null,
  product_id uuid references products(id) not null,
  quantity numeric not null check (quantity > 0),
  unit_price numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create inventory table
create table inventory (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) not null,
  location_id uuid references locations(id) not null,
  quantity numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(product_id, location_id)
);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers to all tables
create trigger update_locations_updated_at
  before update on locations
  for each row
  execute function update_updated_at_column();

create trigger update_suppliers_updated_at
  before update on suppliers
  for each row
  execute function update_updated_at_column();

create trigger update_products_updated_at
  before update on products
  for each row
  execute function update_updated_at_column();

create trigger update_receipts_updated_at
  before update on receipts
  for each row
  execute function update_updated_at_column();

create trigger update_receipt_items_updated_at
  before update on receipt_items
  for each row
  execute function update_updated_at_column();

create trigger update_inventory_updated_at
  before update on inventory
  for each row
  execute function update_updated_at_column(); 