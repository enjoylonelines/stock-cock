# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**한끼재고** — 소규모 제조업체를 위한 한국어 PWA 재고 관리 시스템. 창고 재고의 입고/출고/이동/조정 트랜잭션을 실시간으로 추적하며, 푸시 알림과 모바일 지원을 제공한다.

## 명령어

```bash
# 개발
pnpm dev              # Next.js dev (Turbopack, localhost)
pnpm dev:mobile       # 개발 서버 0.0.0.0 (모바일 테스트용 LAN 접근)

# 빌드
pnpm build            # 프로덕션 빌드 (PWA 호환을 위해 webpack 사용)
pnpm build:analyze    # 번들 분석 (ANALYZE=true 설정)

# 코드 품질 (Biome)
pnpm lint             # 린트 및 자동 수정
pnpm format           # 코드 포맷

# 테스트 (Jest)
pnpm test             # 전체 테스트 실행
pnpm test:watch       # 워치 모드

# 데이터베이스 (Supabase CLI)
pnpm db:start         # 로컬 Supabase 시작
pnpm db:stop          # 로컬 Supabase 중지
pnpm db:reset         # 전체 마이그레이션 초기화 후 재적용
pnpm db:migrate       # 대기 중인 마이그레이션 실행
pnpm db:diff          # 로컬과 원격 스키마 비교
pnpm db:pull          # 원격 스키마 변경사항 가져오기
```

**주의**: 개발은 Turbopack을 사용하지만, 프로덕션 빌드는 반드시 webpack을 사용해야 한다 (next-pwa가 Turbopack과 호환되지 않음).

## 아키텍처

### 상태 관리 (3계층)

1. **서버 상태** (SWR) — 상품, 재고, 거래 내역. `src/lib/swr-config.ts`에서 `revalidateOnFocus: false`, 중복 요청 방지 간격 2초로 설정.
2. **전역 UI 상태** (Zustand) — 폼 지속성(localStorage), 드로어 개폐, 필터, 정렬. `src/store/`에 위치.
3. **로컬 상태** (React `useState`) — 폼 입력값, 모달.

### 데이터 흐름

클라이언트 컴포넌트 → SWR 훅 → Next.js API 라우트 → Supabase (직접 클라이언트 또는 RPC).

복잡한 쓰기 작업은 Supabase RPC를 통해 처리한다 (예: `create_transaction(p_header, p_items)`는 트랜잭션 헤더 + 아이템 생성 + 재고 업데이트를 하나의 SQL 호출로 원자적으로 처리).

### 도메인 레이어

`src/lib/domain/`은 Supabase 뷰 타입과 앱 도메인 타입을 연결한다:
- `stock.ts` — nullable Supabase 뷰 행을 `DomainStockItem`으로 변환 (타입 가드: `isMaterialItem`, `isFinishedItem`)
- `format.ts` — 화면 표시 포맷팅 (`formatStock`, `formatBoxBreakdown`, `formatMaterialSummary`, `formatWeight`)

핵심 구분: **원재료**는 `weight_in_grams` 사용 (정수 g 단위 저장, kg으로 표시), **완제품**은 수량(EA) 사용.

### API 라우트 (`src/app/api/`)

모든 라우트는 `src/utils/api-handler.ts`의 `handleAPIError`로 통합 에러 처리를 하고, `src/utils/logger.ts`의 `apiLogger`로 구조화 로깅을 한다. 알려진 에러는 표준 코드와 함께 `APIError`로 throw한다.

### PWA / 서비스 워커

커스텀 SW는 `worker/index.ts` (next-pwa가 컴파일). 푸시 이벤트는 3단계 폴백 방식: JSON 파싱 → text → 기본 알림. `public/` 디렉토리에 workbox 파일과 manifest 포함.

푸시 구독은 디바이스 단위 (`user_id + device_id` 복합키)이므로 한 사용자가 여러 디바이스를 등록할 수 있다.

### 인증

Supabase Auth (쿠키 기반 세션). `src/lib/supabase/server.ts`는 서버 사이드 클라이언트, `src/lib/supabase/client.ts`는 브라우저용. `SessionRestore` 컴포넌트가 앱 마운트 시 세션 복구를 처리한다.

## 코딩 컨벤션

- **경로 별칭**: `@/` → `src/`
- **포맷**: 들여쓰기 2칸, 줄 길이 120자, 항상 세미콜론 (Biome)
- **임포트**: 타입 전용 임포트는 `import type` 사용 (`useImportType: error`)
- **스타일링**: `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge)
- **UI 컴포넌트**: `src/components/ui/`의 shadcn/ui 프리미티브

## 데이터베이스

Supabase (PostgreSQL). 스키마는 `supabase/migrations/`에 마이그레이션 13개로 관리.

주요 테이블: `products`, `product_options`, `inventory`, `transactions`, `transaction_items`, `warehouses`, `suppliers`, `push_subscriptions`, `user_read_status`.

`inventory` 테이블은 `create_transaction` RPC가 업데이트한다 — 앱에서 직접 수정하지 않는다.

## 테스트

Jest + jsdom. 테스트 파일은 `src/__tests__/`에 위치. 단일 파일 실행:

```bash
pnpm test src/__tests__/inventory.test.ts
```
