# 운영 제품·입출고 관리 마이그레이션 검증

- 일시: 2026-11-09 (Asia/Seoul)
- 대상: stock-cock-renewal / kqkvgqbdgkgbhjcuwxei
- 실행 경로: Supabase MCP.
- 저장소: enjoylonelines/stock-cock, 작업 브랜치 dev (4e04614), 원격 main 병합 커밋 9cb6218.
- 적용 결과: apply_migration 호출이 success=true를 반환했다.

## 적용 내용

병합된 supabase/migrations/20261106000000_product_transaction_management.sql을 그대로 적용했다. 적용 시 lock_timeout 5초, statement_timeout 30초를 설정했다. 제품 deleted_at, 입출고 cancelled_at/revision, management_audit, 관리 RPC, 제품 재고 변경 보호 트리거와 조회 뷰를 추가·갱신했다.

MCP가 생성한 이력 버전 20261109054940은 저장소 파일과 중복 적용되지 않도록 동일 작업의 이력 행에 한해 20261106000000으로 정렬했다. 스키마 SQL은 변경하지 않았다.

## 운영 데이터 비교

| 항목 | 적용 전 | 테스트 롤백 후 |
|---|---:|---:|
| 제품 | 140 | 140 |
| 옵션 | 139 | 139 |
| 재고 행 | 114 | 114 |
| 입출고 | 654 | 654 |
| 입출고 품목 | 1876 | 1876 |
| 새 감사 기록 | 해당 테이블 없음 | 0 |
| 테스트 제품 잔여 | 0 | 0 |

재고 전체 행을 ID 순으로 정렬한 JSON의 MD5는 적용 전후 및 롤백 후 모두 72041152b033d9c4b9b9e27cb3ce0b41로 같았다. 중복 옵션/창고 재고 키는 적용 전 0건이었다.

## 운영 DB 기능 테스트

supabase/tests/product_transaction_management_rollback.sql을 Supabase execute_sql로 실행했다.

- 하나의 BEGIN/ROLLBACK 트랜잭션에서 authenticated DB 역할을 사용했다.
- 테스트용 임의 UUID를 요청 컨텍스트에 설정했다. 실제 사용자 계정으로 로그인하거나 기존 사용자를 대신하여 앱 세션을 사용한 테스트는 아니다.
- 모든 제품·분류·브랜드·창고·거래는 테스트 안에서 생성했다. 실제 업무 행을 수정하지 않았다.
- 결과: passed_groups=13, all assertions passed.
- 등록 원자성, 옵션 실패 롤백, 원재료 g 등록, 입출고 재고/작업자, 수정 차이 반영 및 오래된 revision 거부, 중복 취소 방지 및 목록 제외, 재고 부족 시 전체 롤백, 창고 변경, 다품목 실패 롤백, 원재료 수정·취소, 제품 삭제 조건 및 재사용 차단, 비활성 제품 이력·메모·단위 보존, 인증 및 감사 테이블 접근을 확인했다.
- 테스트 중 감사 행 11개가 생성되는 것도 확인했으며 전체 ROLLBACK 뒤 실제 감사 행은 0개였다.
- 테이블/행 수준의 쓰기 잠금은 짧은 테스트 중 사용됐으며 처리량이나 운영 동시 부하 측정은 아니다.

## 배포 사이트 최소 확인

https://stock-cock.vercel.app

- 루트 응답: HTTP 307 (인증 화면 이동)
- POST /api/products/manage, 빈 JSON/비로그인: HTTP 401, 로그인이 필요합니다.
- GET /api/transactions/존재하지않는UUID, 비로그인: HTTP 401, 로그인이 필요합니다.
- 운영 계정 로그인 후 브라우저에서 등록·수정·삭제하는 E2E 테스트, 실기기 모바일, 이미지 업로드, 실시간 갱신 및 푸시는 이번 운영 검증에서 수행하지 않았다. 기존 localhost 브라우저는 별도 개발 DB에 연결된 상태다.

## 보안 점검

신규 감사 테이블의 RLS는 활성화되어 있고 anon/authenticated SELECT는 거부된다. 새 관리 함수와 create_transaction의 anon EXECUTE는 거부되고 authenticated EXECUTE만 허용된다. 관리 함수는 내부 auth.uid 검사도 통과해야 한다.

Supabase advisors 전후 비교:

- 기존 12개 public 테이블의 RLS 비활성 경고와 기존 조회 뷰 2개의 security-definer 경고는 적용 전부터 있었으며 그대로 남아 있다. 전역 권한 정책 변경은 이번 기능 적용 범위에서 수행하지 않았다.
- 기존 create_transaction의 익명 security-definer 실행 경고는 제거됐다.
- authenticated 관리 함수의 security-definer 실행 경고 4건은 공유 업무 데이터 관리 정책을 반영한다. 현재 모든 로그인 사용자에게 관리 작업을 허용하며 작성자별 제한은 없다.
- management_audit의 RLS 활성/정책 없음 INFO는 외부 직접 조회를 막는 내부 감사 테이블 설계와 일치한다.
- 기존 유출 비밀번호 보호 비활성, PostgreSQL 보안 패치 권고도 남아 있다.

참고:
- https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
- https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

## 저장소 상태

앱 코드 추가 변경 없이 운영 DB를 적용하고, 이 검증 문서와 재현 가능한 롤백 테스트 SQL을 추가했다.
