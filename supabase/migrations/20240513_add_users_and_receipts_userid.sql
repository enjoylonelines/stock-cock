-- users 테이블 생성
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  avatar_url text,
  created_at timestamp(0) with time zone default now(),
  updated_at timestamp(0) with time zone default now()
);

-- receipts 테이블에 user_id 컬럼 추가
alter table receipts add column if not exists user_id uuid references users(id); 