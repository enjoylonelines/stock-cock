# Stock-Cock | 제조 현장 재고·거래 관리 서비스

현장과 주문 담당자가 **장소 제약 없이 현재 재고와 입·출고 이력을 확인하고 기록**할 수 있도록 만든 모바일 우선 웹 서비스입니다.

완제품과 원재료를 엑셀로 나누어 관리하던 과정에서는 변경 시점과 담당자를 확인하기 어려웠고, 급한 주문·샘플 출고·생산 계획을 검토할 때마다 창고 확인이 필요했습니다. Stock-Cock은 이 업무 흐름을 재고 현황, 거래 기록, 조정 사유로 연결했습니다.

- 서비스: [stock-cock.vercel.app](https://stock-cock.vercel.app) — 로그인 필요
- 저장소: [enjoylonelines/stock-cock](https://github.com/enjoylonelines/stock-cock)
- 역할: 기획, 화면 설계, Next.js·Supabase 기반 서버 및 데이터 흐름 구현, PWA 배포

> 공개 README에는 운영 계정·실사용 데이터·회사 식별 정보를 포함하지 않습니다.

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 문제 | 엑셀 변경 이력을 신뢰하기 어려워 주문·창고·생산 담당자가 재고를 다시 확인해야 했습니다. |
| 사용자 가치 | 현재고와 최근 거래를 모바일에서 확인하고, 입고·출고·이동·조정 사유를 기록합니다. |
| 핵심 판단 | 완제품과 원재료는 단위와 확인 목적이 달라 화면과 집계 기준을 분리했습니다. |
| 데이터 흐름 | 입출고는 거래 생성·재고 갱신·거래 품목 기록을 하나의 DB 함수에서 처리합니다. |
| 범위 | 내부 재고 관리 서비스입니다. 외부 ERP API 연동, 회계·세금·결제 처리는 포함하지 않습니다. |

## 실제 업무 흐름

<p align="center">
  <img src="./docs/evidence/2026-10-13-stock-cock-local-ui-capture/stock-cock-local-ui-flow.gif" alt="로그인 뒤 현재 재고와 거래 이력을 조회하는 Stock-Cock 화면" width="250" />
  <img src="./docs/evidence/2026-10-13-stock-cock-local-ui-capture/stock-cock-product-registration.gif" alt="제품과 초기 재고를 등록하는 Stock-Cock 화면" width="250" />
  <img src="./docs/evidence/2026-10-13-stock-cock-local-ui-capture/stock-cock-inbound.gif" alt="입고를 기록하고 거래 이력에서 확인하는 Stock-Cock 화면" width="250" />
</p>

| 흐름 | 사용자가 하는 일 | 서비스가 남기는 정보 |
| --- | --- | --- |
| 재고 확인 | 주문·생산·창고 담당자가 현재고와 최근 입출고를 조회 | 품목·창고별 현재 수량과 거래 이력 |
| 제품 등록 | 제품 유형, 보관 창고, 초기 수량을 입력 | 제품 정보와 초기 재고 |
| 입고·출고 | 수량과 거래 맥락을 기록 | 거래 헤더, 품목별 거래, 재고 변화 |
| 재고 조정 | 실제 수량과 차이가 난 이유를 기록 | 조정 사유와 조정 거래 이력 |

GIF는 격리된 로컬 Supabase fixture에서 실제 로그인·폼 입력·조회·쓰기 흐름을 녹화한 자료입니다. 제품 등록과 입고 시연은 로컬 DB에 기록을 남기며, 운영 데이터 규모나 실제 사용자 처리량을 나타내지는 않습니다.

## 문제를 데이터 흐름으로 바꾼 판단

### 1. 입출고 기록과 재고 갱신을 같은 처리 단위로 관리

입출고는 화면에서 성공으로 보이더라도 거래 이력과 현재 재고가 따로 갱신되면 신뢰하기 어렵습니다. 그래서 입출고 API는 `create_transaction` DB 함수를 호출해 거래 생성, 품목 기록, 재고 갱신을 하나의 처리 단위로 수행하도록 구성했습니다.

```mermaid
sequenceDiagram
    participant User as 현장·주문 담당자
    participant API as Next.js API
    participant DB as PostgreSQL RPC

    User->>API: 입고 또는 출고 기록
    API->>DB: create_transaction
    DB->>DB: 거래 생성
    DB->>DB: 품목별 재고 갱신
    DB->>DB: 거래 품목 기록
    DB-->>API: 거래 결과
    API-->>User: 최신 재고·이력 표시
```

재고 조정과 창고 간 이동은 각각 별도 API 경로에서 처리하며, 오류를 사용자에게 반환하고 거래 알림 실패는 본 처리와 분리해 기록합니다.

### 2. 완제품과 원재료를 같은 목록으로 취급하지 않음

완제품은 주문·출고 시 수량 확인이 중심이고, 원재료는 입고 단위와 사용량 확인이 중심입니다. 두 데이터의 단위와 조회 이유가 달라 제품 유형, 화면 탭, 집계 기준을 분리했습니다. 이를 통해 원재료 추가 요구가 생겼을 때 기존 완제품 흐름을 훼손하지 않고 확장할 수 있었습니다.

### 3. 현장 사용 환경에 맞춘 모바일 웹

별도 앱 설치 없이 링크 접근으로 시작할 수 있도록 PWA를 선택했습니다. 모바일에서 재고를 빠르게 조회하고 입력할 수 있게 했으며, 폼 입력·필터·드로어 같은 화면 상태와 제품·재고·거래 이력 같은 서버 상태를 분리했습니다.

## 구현 범위

### 업무 기능

- 품목·창고별 재고 조회 및 검색
- 완제품·원재료 분리 관리와 단위별 수량·중량 처리
- 입고, 출고, 창고 이동, 재고 조정
- 거래 이력과 당일 입고·출고·조정 요약
- 사용자 인증, 이미지 저장, 웹 푸시 알림

### 기술 구성

| 구분 | 사용 기술 |
| --- | --- |
| Frontend | TypeScript, Next.js App Router, React, Tailwind CSS, shadcn/ui |
| 상태 관리 | SWR, Zustand |
| Backend / DB | Next.js Route Handler, Supabase Auth, PostgreSQL, Storage, RPC |
| 품질 / 배포 | Jest, Biome, PWA Service Worker, Web Push, Vercel |

## 코드와 문서 안내

| 확인 대상 | 위치 |
| --- | --- |
| 입출고 API와 DB 함수 호출 | [`src/app/api/transactions/route.ts`](./src/app/api/transactions/route.ts) |
| 재고 조정 API | [`src/app/api/adjustments/route.ts`](./src/app/api/adjustments/route.ts) |
| 재고 갱신 유틸리티 | [`src/utils/inventory.ts`](./src/utils/inventory.ts) |
| 거래 DB 함수 마이그레이션 | [`supabase/migrations/20260131110000_fix_create_transaction_rpc_signature.sql`](./supabase/migrations/20260131110000_fix_create_transaction_rpc_signature.sql) |
| 로컬 Supabase 설정 | [`docs/SUPABASE_SETUP.md`](./docs/SUPABASE_SETUP.md) |
| 기술 설계 기록 | [`docs/TECHNICAL_DESIGN_DECISIONS.md`](./docs/TECHNICAL_DESIGN_DECISIONS.md) |

## 실행

```bash
pnpm install
pnpm dev
```

검사와 프로덕션 빌드:

```bash
pnpm lint
pnpm test
pnpm build
```

로컬 Supabase 환경 변수는 `.env.local`에 설정합니다. 실제 서비스 키와 계정 정보는 저장소에 포함하지 않습니다.

## 현재 경계와 다음 판단

- 현재 서비스는 재고·거래 관리의 내부 업무 흐름을 다룹니다. 외부 ERP와의 데이터 동기화는 구현 범위 밖입니다.
- 입출고 DB 함수는 거래와 재고 변경을 함께 처리하지만, 운영 환경의 동시 요청·장애 복구·대규모 처리량은 별도 조건에서 검증해야 합니다.
- 재고 정합성 강화용 DB 변경은 운영 DB 적용 절차와 함께 별도 릴리스로 관리해야 합니다.

## 라이선스

MIT
