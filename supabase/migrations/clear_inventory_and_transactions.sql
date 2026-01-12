-- 재고 및 입출고 내역 초기화 스크립트
-- 재고(inventory)와 입출고 내역(transactions, transaction_items, inventory_batches)만 삭제합니다.
-- 제품, 창고, 공급업체 등 마스터 데이터는 유지됩니다.
-- 주의: 이 스크립트는 재고와 입출고 내역을 영구적으로 삭제합니다!

-- 외래 키 제약 조건을 고려하여 순서대로 삭제합니다.

-- 1. transaction_items 삭제 (가장 먼저 - transactions와 inventory_batches를 참조)
TRUNCATE TABLE transaction_items CASCADE;

-- 2. inventory_batches 삭제 (transaction_items가 참조)
TRUNCATE TABLE inventory_batches CASCADE;

-- 3. transactions 삭제 (transaction_items가 참조)
TRUNCATE TABLE transactions CASCADE;

-- 4. inventory 삭제 (재고 데이터)
TRUNCATE TABLE inventory CASCADE;

-- 모든 재고 및 입출고 내역 삭제 완료
-- 참고: 제품(products), 제품 옵션(product_options), 창고(warehouses), 공급업체(suppliers) 등은 유지됩니다.

