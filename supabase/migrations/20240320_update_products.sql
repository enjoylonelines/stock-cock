-- 기존 products 테이블이 있다면 삭제
drop table if exists products cascade;

-- products 테이블 재생성
create table products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  sell_price integer not null,
  buy_price integer not null,
  category text not null,
  brand text not null,
  stock integer not null default 0,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- updated_at 트리거 추가
create trigger update_products_updated_at
  before update on products
  for each row
  execute function update_updated_at_column();

-- 테스트 데이터 추가
insert into products (name, sell_price, buy_price, category, brand, stock, image_url)
values 
  ('고기왕만두', 29900, 20000, '만두', '더바른한끼', 1000, '/images/product-1.jpg'),
  ('김치왕만두', 13900, 15900, '만두', '더바른한끼', 500, '/images/product-2.jpg'),
  ('치킨왕만두', 15900, 12000, '만두', '더바른한끼', 800, '/images/product-3.jpg'),
  ('새우왕만두', 17900, 14000, '만두', '더바른한끼', 600, '/images/product-4.jpg'),
  ('불고기왕만두', 19900, 16000, '만두', '더바른한끼', 700, '/images/product-5.jpg'); 