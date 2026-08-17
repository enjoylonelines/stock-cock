# 기술 Q&A

이 문서는 한끼재고 프로젝트 기준으로 기술 면접·리뷰에서 나올 수 있는 질문과 답변을 정리한 것입니다.

---

## 아키텍처·설계 (1~5)

### 1. 이 프로젝트의 전체 아키텍처(프론트/백/상태/데이터 흐름)를 한 문단으로 설명해 달라.

Next.js 16 App Router 기반의 풀스택 웹앱이며, 프론트는 React + TypeScript + Tailwind/shadcn/ui, 백엔드·인증·DB·스토리지는 Supabase가 담당한다. 전역 UI 상태(드로어, 필터, 폼)는 Zustand + localStorage로, 서버 데이터(제품·재고·입출고 이력)는 SWR로 페칭·캐싱한다. DB 뷰 Row는 `toInventoryItem` 등으로 도메인 타입(`DomainInventoryItem`)으로 변환한 뒤 UI에서 사용하며, 재고/규격 표시는 `formatStock`, `formatSpecWeight` 등 도메인 포맷 함수로 중앙화했다.

### 2. 도메인 레이어를 둔 이유와, DB 타입과 도메인 타입을 분리한 이점은?

DB 뷰(Supabase Row)는 null 가능 필드·snake_case·물리 스키마에 묶여 있어, UI·비즈니스 로직에서 직접 쓰면 null 처리·단위 추론이 흩어지고 NonNullAssertion(`!`)이 늘어난다. 도메인 레이어(`src/types/domain.ts`, `src/lib/domain/`)를 두어 뷰 Row → `DomainInventoryItem` 변환을 `toInventoryItem` 한 곳에서 하면, null 처리·StockUnit 추론·포맷 규칙을 한곳에서 관리할 수 있고 타입 안정성과 유지보수성이 좋아진다.

### 3. product_type(UI 분류)과 StockUnit(비즈니스 단위)을 나눈 이유는?

`product_type`은 탭·필터용 UI 분류(company, franchise, pb, material)이고, `StockUnit`(EA | GRAM)은 재고 계산·표시용 비즈니스 단위다. DB에 `stock_unit` 컬럼을 추가하지 않고, `getStockUnit(productType)`으로 material이면 GRAM, 아니면 EA로 추론해 사용한다. 이렇게 하면 UI 분류와 재고 단위를 분리해, “표시용”과 “계산용”이 섞이지 않고 규격 변경 시 코드 한 곳만 수정하면 된다.

### 4. 입·출고·조정·이동을 하나의 transactions + transaction_items 구조로 설계한 이유와 트레이드오프는?

모든 거래를 `type`(in/out/move/adjust)으로 구분하고, `transaction_items`로 품목별 수량을 저장하면 이력 조회·집계·필터링을 하나의 스키마로 처리할 수 있다. 트레이드오프는 타입별로 컬럼 의미가 다르다는 점(예: 이동은 from/to warehouse, 조정은 목표 재고)인데, 공통 필드만 두고 타입별로 필요한 필드만 사용하는 방식으로 맞췄다.

### 5. 완제품(개수)과 원재료(g)를 같은 inventory 테이블에 두고 quantity / weight_in_grams로 구분한 이유는?

완제품과 원재료 모두 “제품 옵션별·창고별 현재고”라는 동일한 개념이라 하나의 테이블로 관리하고, 완제품은 `quantity`, 원재료는 `weight_in_grams`를 쓰도록 했다. 공통 로직(입출고 API, 재고 조회, 재고 계산)을 하나로 유지할 수 있고, `product_type`으로 어떤 컬럼을 쓸지 분기하면 된다. 별도 테이블로 나누면 중복 로직과 조인이 늘어난다.

---

## Next.js·프론트 (6~10)

### 6. App Router를 쓰는 이유와, 이 프로젝트에서 라우트 구조를 어떻게 나눴는지?

App Router는 레이아웃·로딩·에러 경계를 파일 시스템으로 표현할 수 있어, 공통 레이아웃(헤더/푸터)과 로딩 UI를 `/app/layout.tsx`, `loading.tsx`로 일관되게 둘 수 있다. 라우트는 `/`(리다이렉트), `/home`, `/products`, `/products/[id]`, `/inventory`, `/inventory/[id]`, `/auth/signin`, `/auth/signup`, `/settings` 등으로 나누고, 페이지별로 `page.tsx`와 필요한 `layout.tsx`만 두었다.

### 7. 서버 컴포넌트와 클라이언트 컴포넌트를 어떻게 나누었고, 레이아웃·인증 등은 어디서 처리하는지?

루트 `layout.tsx`는 서버 컴포넌트로 Supabase `createClient()`로 쿠키 기반 세션을 읽고, `getUser()`·`profiles` 조회 후 `UserProvider`에 넘긴다. 폼·드로어·입출고 선택·필터 등 상호작용이 있는 UI는 `"use client"`로 클라이언트 컴포넌트다. 인증이 필요한 페이지는 미들웨어 또는 레이아웃/페이지에서 user 체크 후 리다이렉트하는 방식으로 처리한다.

### 8. 이미지 최적화(Next Image, remotePatterns)를 어떻게 적용했는지?

`next.config.ts`의 `images.remotePatterns`에 Supabase 스토리지 도메인(`kqkvgqbdgkgbhjcuwxei.supabase.co`)과 아바타용 `i.pravatar.cc`를 등록했고, `formats: ["image/avif", "image/webp"]`, `deviceSizes`/`imageSizes`로 리사이즈 구간을 지정했다. 제품·아바타 이미지는 `<Image>`로 로드해 자동 포맷·리사이즈를 받고, `sizes`로 레이아웃에 맞는 크기만 요청하도록 했다.

### 9. 폼 상태(드로어·필터·입출고 폼)를 Zustand로 관리한 이유와, localStorage와 어떻게 연동했는지?

드로어·필터·입출고 폼은 여러 화면에서 공유되므로 전역 상태가 필요하고, Zustand는 보일러플레이트가 적고 Provider 없이 쓸 수 있어 선택했다. `formStateStore` 등에서는 persist 대신 커스텀으로 `loadFromStorage`/`saveToStorage`를 두고, Date 필드는 복원 시 `new Date()`로 바꾸고, File·Object URL은 직렬화에서 제외해 저장한다.

### 10. SWR을 쓴 이유와, 캐시 키 설계·재검증·에러 처리 방식은?

여러 컴포넌트가 같은 데이터(제품 목록, 재고, 입출고 이력)를 쓰므로 캐싱·중복 제거가 필요해 SWR을 썼다. 캐시 키는 `"products"`, `"inventories"`, `["inventory-history", inventories.length]` 등으로 두고, 재검증은 `revalidateOnFocus: false`, 필요 시 `mutate()`로 수동 호출한다. fetcher 내부에서 `try/catch`로 `console.error` 후 rethrow 해서, 네트워크는 성공했지만 응답 처리 중 에러가 나도 원인을 콘솔에서 확인할 수 있게 했다.

---

## Supabase·백엔드 (11~13)

### 11. Supabase를 선택한 이유와, RLS·인증·스토리지 사용 방식은?

2주 내 MVP가 목표였고 1인 개발이라, DB·인증·스토리지를 한 번에 쓰기 위해 Supabase를 선택했다. RLS로 테이블별 접근을 user 기준으로 제한하고, 인증은 쿠키 기반 세션(`@supabase/ssr`)으로 서버/클라이언트에서 공통 사용한다. 제품 이미지는 Storage 버킷에 올리고 Public URL을 `product_options` 등에 저장해 사용한다.

### 12. transaction_history_view 같은 뷰를 둔 이유와, 조인 결과를 클라이언트에서 어떻게 다루는지(객체/배열 처리)?

입출고 이력을 한 번의 쿼리로 가져오기 위해 transactions + transaction_items + product_options + products 등 조인을 뷰로 묶었다. PostgREST는 many-to-one 관계를 단일 객체로 반환할 수 있어, `product_options?.[0]`만 쓰면 undefined가 나올 수 있다. 그래서 `getProductType(item)`처럼 `Array.isArray(po) ? po[0] : po`로 객체/배열 둘 다 처리해 `product_type`을 꺼내서 사용한다(예: `useStats`에서 출고 vs 원재료 분리).

### 13. 입·출고 API에서 트랜잭션 일관성을 어떻게 맞추었는지(RPC 처리, 검증 범위)?

초기 구현은 애플리케이션 코드에서 `transactions` 생성, 재고 조회·갱신, `transaction_items` 기록을 순차 처리했지만, 현재 입·출고 API는 Supabase RPC `create_transaction(p_header, p_items)`를 호출한다. 이 함수는 DB 내부에서 거래 헤더를 만들고 품목별로 `inventory`와 `transaction_items`를 갱신한다. 따라서 “클라이언트 코드의 4단계 처리” 설명은 오래된 설명이고, 현재 코드 기준으로는 RPC 기반 처리라고 말하는 것이 맞다.

다만 검증 범위는 분리해서 설명해야 한다. 코드와 migration에는 RPC가 존재하지만, 운영 DB에 적용된 함수의 실제 rollback, 동시 요청 제어, 음수 재고 방지까지 검증됐다고 단정하지 않는다. 특히 현재 `create_transaction`에는 `FOR UPDATE`나 음수 재고 guard가 보이지 않으므로, 그 부분은 별도 DB 통합 테스트와 정책 결정이 필요하다. 이동·조정 RPC는 작업 트리에 진행 중 변경이 있어 완료된 기능이 아니라 검증 전 개선 항목으로 분류한다.

---

## PWA·모바일 (14~16)

### 14. PWA를 선택한 이유와, next-pwa·Service Worker·manifest 설정 요약은?

“설치 없이 바로 사용”이 필요하고 단일 코드베이스로 웹·앱을 같이 쓰기 위해 PWA를 선택했다. next-pwa(`@ducanh2912/next-pwa`)로 빌드 시 `public/sw.js`와 workbox 프리캐시를 생성하고, 커스텀 푸시/알림 로직은 `worker/index.ts`에 둔다. manifest는 `display: standalone`, `start_url`, 아이콘을 두고, `next.config.ts`에서 `dest: "public"`, `sw: "/sw.js"`, `customWorkerSrc: "worker"`로 맞췄다.

### 15. iOS에서 "홈 화면에 추가" 후 앱처럼 동작하지 않던 문제와 해결(meta 태그·manifest)은?

Safari는 manifest보다 HTML meta를 먼저 보는 경우가 있어, `apple-mobile-web-app-capable`이 없으면 북마크처럼 주소창이 보이는 상태로 열렸다. `layout.tsx`에 `<meta name="apple-mobile-web-app-capable" content="yes" />`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`을 추가해, 첫 번째 “홈 화면에 추가”부터 standalone으로 동작하도록 했다. manifest의 `short_name`은 "한끼재고"로 통일했다.

### 16. PWA 배포 후에도 구버전이 보이던 현상의 원인과, Service Worker 업데이트 시 자동 새로고침 처리 방식은?

Service Worker가 예전 자산을 캐시해 두어, 배포 후에도 이전 JS가 실행되면서 오류가 났다. 새 SW가 설치·활성화될 때(`controllerchange`) 페이지를 한 번 새로고침하면 최신 코드를 쓰게 된다. `ServiceWorkerReload` 컴포넌트에서 `navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload())`를 등록해, SW가 바뀌면 자동으로 새로고침되도록 했다.

---

## 데이터·비즈니스 로직 (17~18)

### 17. product_options.weight는 항상 g으로 저장하고, unit_label은 kg/g으로 두는 이유와, 화면 표시(formatSpecWeight) 방식은?

DB에서 재고·규격 계산을 하나의 단위(g)로 통일하려고 weight는 항상 g으로 저장한다(14kg → 14000). `unit_label`은 사용자가 선택한 규격 표시용(kg/g)으로만 두고, 화면에서는 `formatSpecWeight(weightInGrams, unitLabel)`로 unit_label이 "kg"이면 weight/1000으로 "14kg"처럼 보여준다. 이렇게 하면 저장은 g 기준으로 일관되고, 표시만 사용자 규격에 맞출 수 있다.

### 18. 입출고 내역이 안 나오던 원인 두 가지(SWR key·map index)와 수정 내용은?

(1) SWR key를 `inventories.length > 0`일 때만 주어서, 재고가 0이거나 아직 로드 전이면 fetch 자체가 실행되지 않았다. key를 항상 `["inventory-history", inventories.length]`로 두고, 빈 배열이어도 processTransactionData를 호출하도록 바꿨다. (2) processTransactionData 안에서 `broadcast_id: data.length - index`를 쓰는데 map 콜백에 `index`를 넣지 않아 ReferenceError가 났고, fetcher가 throw되면서 grouped가 undefined가 됐다. `.map((tx, index) => ...)`로 index를 넘기도록 수정했다.

---

## 트러블슈팅·운영 (19~20)

### 19. Supabase 조인 결과가 배열이 아닌 단일 객체로 올 때, StatsBox 출고/원재료 분리가 잘못되던 이유와 getProductType 같은 처리 방식은?

PostgREST는 many-to-one 관계를 단일 객체로 반환할 수 있어, `transaction_items`의 `product_options`가 `[{ ... }]`가 아니라 `{ ... }`로 올 수 있다. 이때 `product_options?.[0]`는 undefined가 되고, `product_type`을 못 읽어 모든 품목이 비원재료로 분류되어, 원재료 출고량(g)까지 “출고” 합계에 포함됐다. `getProductType(item)`에서 `Array.isArray(po) ? po[0] : po`로 객체/배열 모두 처리해 product_type을 꺼내도록 해서 출고(비원재료만)와 원재료 사용량을 분리했다.

### 20. CHECK 제약(storage_type 등) 위반이 났을 때 흔한 원인(공백·대소문자)과 대응 방법은?

CHECK는 허용 값과 정확히 일치해야 해서, 앞뒤 공백(`'room_temperature '`)이나 대소문자 차이가 있으면 실패한다. Supabase 대시보드에서 수동 입력 시 공백이 들어간 경우가 많다. 대응은 (1) SQL로 `UPDATE ... SET storage_type = TRIM(storage_type)` 등으로 정리하거나, (2) 앱에서 저장 전에 `storage_type`을 TRIM/허용 값으로 검증한 뒤 넣는 것이다. DB에 TRIM을 적용하는 트리거를 두는 방법도 있다.
