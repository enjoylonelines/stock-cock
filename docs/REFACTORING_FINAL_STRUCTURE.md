# 최종 리팩토링 구조

## 📁 최종 디렉토리 구조

```
src/
├── lib/                          # 공용 비즈니스 로직
│   ├── inventory/
│   │   └── stock-calculator.ts  # 공용 재고 계산 (여러 feature에서 사용)
│   ├── supabase/                # Supabase 클라이언트
│   ├── swr-config.ts            # SWR 설정
│   └── utils.ts                 # 범용 유틸리티 (CSS, 포맷팅 등)
│
├── utils/                        # 공용 인프라 유틸리티
│   ├── api-error.ts             # API 에러 클래스
│   ├── api-handler.ts           # API 에러 핸들러
│   ├── client-logger.ts         # 클라이언트 로깅
│   ├── logger.ts                # 서버 로깅
│   ├── inventory.ts             # 재고 DB 접근 유틸
│   ├── product-icon.ts          # 제품 아이콘 유틸
│   └── transaction-notification.ts  # 트랜잭션 알림
│
├── services/                     # 공용 서비스
│   ├── push-notification.ts     # 푸시 알림 (여러 feature에서 사용)
│   └── product-api.ts           # 제품 API (기존, 추후 정리 가능)
│
├── hooks/                        # 공용 훅 (여러 feature에서 사용)
│   ├── useCRUD.ts               # 공용 CRUD 훅
│   ├── useProducts.ts           # 제품 데이터 (여러 feature에서 사용)
│   ├── useWarehouses.ts         # 창고 데이터 (여러 feature에서 사용)
│   ├── useInventories.ts        # 재고 데이터 (여러 feature에서 사용)
│   ├── useSuppliers.ts          # 거래처 데이터 (여러 feature에서 사용)
│   ├── useInventoryHistory.ts   # 재고 이력 (여러 feature에서 사용)
│   ├── usePushNotifications.ts # 푸시 알림 (여러 feature에서 사용)
│   ├── useHeaderContent.tsx     # 헤더 컨텐츠
│   ├── useTeamInfo.ts           # 팀 정보
│   └── useActivityReadStatus.ts # 활동별 개별 읽음 상태
│
└── app/
    ├── transactions/
    │   ├── _components/          # Transactions 전용 UI 컴포넌트
    │   ├── _hooks/              # Transactions 전용 비즈니스 로직 훅
    │   ├── _lib/                # Transactions 전용 비즈니스 로직
    │   │   ├── transaction-validator.ts
    │   │   └── transaction-formatter.ts
    │   └── _services/           # Transactions 전용 서비스
    │       └── transaction-service.ts
    │
    ├── products/
    │   ├── _components/         # Products 전용 UI 컴포넌트
    │   ├── _hooks/              # Products 전용 훅
    │   │   ├── useProductList.ts
    │   │   ├── useCategories.ts
    │   │   └── useBrands.ts
    │   ├── _lib/                # Products 전용 비즈니스 로직
    │   │   ├── product-filter.ts
    │   │   └── product-validator.ts
    │   └── _services/           # Products 전용 서비스
    │       └── product-service.ts
    │
    ├── inventory/
    │   ├── _components/         # Inventory 전용 UI 컴포넌트
    │   ├── _hooks/              # Inventory 전용 훅
    │   │   ├── useInventoryList.ts
    │   │   └── useProfiles.ts
    │   └── _lib/                # Inventory 전용 비즈니스 로직
    │       └── inventory-filter.ts
    │
    ├── settings/
    │   ├── _components/         # Settings 전용 UI 컴포넌트
    │   └── _services/          # Settings 전용 서비스
    │       └── settings-service.ts
    │
    └── home/
        ├── _components/         # Home 전용 UI 컴포넌트
        └── _hooks/              # Home 전용 훅
            └── useStats.ts
```

## 📋 구조 원칙

### 1. 공용 로직 (`src/` 하위)
- **`src/lib/`**: 공용 비즈니스 로직
  - 여러 feature에서 사용하는 순수 비즈니스 로직
  - 예: `stock-calculator.ts` (transactions, inventory에서 사용)
- **`src/utils/`**: 공용 인프라 유틸리티
  - 로깅, 에러 처리, DB 접근 등
- **`src/services/`**: 공용 서비스
  - 여러 feature에서 사용하는 API 호출
- **`src/hooks/`**: 공용 훅
  - 여러 feature에서 사용하는 데이터 페칭 훅

### 2. Feature별 로직 (`app/[feature]/` 하위)
- **`_components/`**: 해당 feature 전용 UI 컴포넌트
- **`_hooks/`**: 해당 feature 전용 비즈니스 로직 훅
- **`_lib/`**: 해당 feature 전용 비즈니스 로직 (validator, formatter, filter 등)
- **`_services/`**: 해당 feature 전용 API 호출 서비스

## ✅ 완료된 작업

1. ✅ `lib/features/` 제거
2. ✅ Feature별 로직을 `app/[feature]/_lib/`로 이동
3. ✅ Feature별 서비스를 `app/[feature]/_services/`로 이동
4. ✅ Feature별 훅을 `app/[feature]/_hooks/`로 이동
5. ✅ 공용 로직만 `src/lib/`, `src/utils/`, `src/services/`, `src/hooks/`에 유지
6. ✅ 모든 import 경로 수정
7. ✅ 빌드 성공

## 🎯 구조의 장점

1. **명확한 소유권**: 각 feature의 로직이 해당 feature 폴더에 위치
2. **Colocation**: 관련 파일들이 함께 있어 찾기 쉬움
3. **재사용성**: 공용 로직은 `src/` 하위에서 명확히 구분
4. **확장성**: 새 feature 추가 시 동일한 패턴 적용 가능
5. **실무 표준**: Next.js App Router의 colocation 패턴과 일치
