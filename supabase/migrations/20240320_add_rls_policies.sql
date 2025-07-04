-- Enable RLS on all tables
alter table locations enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table receipts enable row level security;
alter table receipt_items enable row level security;
alter table inventory enable row level security;
alter table users enable row level security;

-- Create policies for locations table
create policy "Allow all authenticated users to read locations" on locations
  for select using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to insert locations" on locations
  for insert with check (auth.role() = 'authenticated');

create policy "Allow all authenticated users to update locations" on locations
  for update using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to delete locations" on locations
  for delete using (auth.role() = 'authenticated');

-- Create policies for suppliers table
create policy "Allow all authenticated users to read suppliers" on suppliers
  for select using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to insert suppliers" on suppliers
  for insert with check (auth.role() = 'authenticated');

create policy "Allow all authenticated users to update suppliers" on suppliers
  for update using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to delete suppliers" on suppliers
  for delete using (auth.role() = 'authenticated');

-- Create policies for products table
create policy "Allow all authenticated users to read products" on products
  for select using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to insert products" on products
  for insert with check (auth.role() = 'authenticated');

create policy "Allow all authenticated users to update products" on products
  for update using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to delete products" on products
  for delete using (auth.role() = 'authenticated');

-- Create policies for receipts table
create policy "Allow all authenticated users to read receipts" on receipts
  for select using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to insert receipts" on receipts
  for insert with check (auth.role() = 'authenticated');

create policy "Allow all authenticated users to update receipts" on receipts
  for update using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to delete receipts" on receipts
  for delete using (auth.role() = 'authenticated');

-- Create policies for receipt_items table
create policy "Allow all authenticated users to read receipt_items" on receipt_items
  for select using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to insert receipt_items" on receipt_items
  for insert with check (auth.role() = 'authenticated');

create policy "Allow all authenticated users to update receipt_items" on receipt_items
  for update using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to delete receipt_items" on receipt_items
  for delete using (auth.role() = 'authenticated');

-- Create policies for inventory table
create policy "Allow all authenticated users to read inventory" on inventory
  for select using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to insert inventory" on inventory
  for insert with check (auth.role() = 'authenticated');

create policy "Allow all authenticated users to update inventory" on inventory
  for update using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to delete inventory" on inventory
  for delete using (auth.role() = 'authenticated');

-- Create policies for users table
create policy "Allow all authenticated users to read users" on users
  for select using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to insert users" on users
  for insert with check (auth.role() = 'authenticated');

create policy "Allow all authenticated users to update users" on users
  for update using (auth.role() = 'authenticated');

create policy "Allow all authenticated users to delete users" on users
  for delete using (auth.role() = 'authenticated'); 