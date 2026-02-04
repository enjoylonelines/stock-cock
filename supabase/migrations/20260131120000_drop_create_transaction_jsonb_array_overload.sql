-- create_transaction 오버로드 정리: jsonb[] 시그니처 제거 (jsonb만 유지)
-- 두 시그니처가 공존하면 PostgREST가 호출 시 어떤 함수를 쓸지 결정하지 못함

DROP FUNCTION IF EXISTS public.create_transaction(jsonb, jsonb[]);
