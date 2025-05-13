-- products 테이블에서 stock 컬럼 제거 및 created_at, updated_at 포맷 변경
alter table products drop column if exists stock;
alter table products alter column created_at type timestamp(0) with time zone using created_at::timestamp(0) with time zone;
alter table products alter column updated_at type timestamp(0) with time zone using updated_at::timestamp(0) with time zone;

-- inventory 테이블의 updated_at 포맷 변경
alter table inventory alter column updated_at type timestamp(0) with time zone using updated_at::timestamp(0) with time zone; 