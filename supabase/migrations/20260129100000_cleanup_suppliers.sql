-- 거래처(suppliers) 정리 마이그레이션
-- 유지할 거래처: 가맹점, 샘플, 생산실, 온라인, 완제품창고
-- 나머지는 삭제하되, 참조 중인 것은 "가맹점"으로 변경 후 삭제

-- Step 1: 삭제 대상 supplier를 참조하는 transactions의 supplier_id를 "가맹점"으로 변경
UPDATE transactions
SET supplier_id = (SELECT id FROM suppliers WHERE name = '가맹점' LIMIT 1)
WHERE supplier_id IN (
  SELECT id FROM suppliers 
  WHERE name NOT IN ('가맹점', '샘플', '생산실', '온라인', '완제품창고')
);

-- Step 2: 유지 목록에 없는 suppliers 삭제
DELETE FROM suppliers
WHERE name NOT IN ('가맹점', '샘플', '생산실', '온라인', '완제품창고');
