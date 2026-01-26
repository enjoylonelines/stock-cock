# 🧪 테스트 가이드

## 테스트 실행 방법

### 1. 모든 테스트 실행

```bash
npm test
```

### 2. Watch 모드로 실행 (개발 중 추천)

파일 변경 시 자동으로 관련 테스트 실행:

```bash
npm run test:watch
```

### 3. 특정 테스트 파일 실행

```bash
# 특정 파일만 실행
npm test -- src/__tests__/api-error.test.ts

# 패턴으로 실행
npm test -- api-error

# 여러 파일 실행
npm test -- src/__tests__/api-error.test.ts src/__tests__/inventory.test.ts
```

### 4. 특정 테스트 케이스만 실행

테스트 파일에서 `.only` 사용:

```typescript
describe.only("APIError", () => {
  it("기본 생성자가 올바른 속성을 설정한다", () => {
    // ...
  });
});
```

또는 `-t` 옵션 사용:

```bash
npm test -- -t "APIError"
```

### 5. 테스트 커버리지 확인

```bash
npm test -- --coverage
```

커버리지 리포트가 터미널과 `coverage/` 폴더에 생성됩니다.

### 6. 자세한 출력

```bash
npm test -- --verbose
```

## 테스트 작성 방법

### 기본 구조

```typescript
import { 함수이름 } from "@/utils/파일이름";

describe("함수이름", () => {
  beforeEach(() => {
    // 각 테스트 전에 실행되는 초기화 코드
    jest.clearAllMocks();
  });

  it("테스트 설명", () => {
    // Arrange (준비)
    const input = "test";

    // Act (실행)
    const result = 함수이름(input);

    // Assert (검증)
    expect(result).toBe("expected");
  });
});
```

### 모킹 (Mocking)

#### 모듈 모킹

```typescript
// 파일 상단에 모킹 선언
jest.mock("@/utils/logger", () => ({
  apiLogger: {
    requestError: jest.fn(),
    requestStart: jest.fn(),
  },
}));
```

#### 함수 모킹

```typescript
import { sendPushNotification } from "@/services/push-notification";

jest.mock("@/services/push-notification");

// 테스트에서 사용
(sendPushNotification as jest.Mock).mockResolvedValue(true);
```

#### Supabase 모킹

```typescript
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// 테스트에서 사용
const selectMock = jest.fn().mockReturnValue({
  eq: jest.fn().mockReturnValue({
    maybeSingle: jest.fn().mockResolvedValue({
      data: { id: "123" },
      error: null,
    }),
  }),
});

(supabase.from as jest.Mock).mockReturnValue({
  select: selectMock,
});
```

### 주요 Matchers

```typescript
// 동등성
expect(value).toBe(4);                    // ===
expect(value).toEqual({ name: "test" });  // 객체/배열 비교

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();

// 숫자
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(4);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3, 5); // 소수점 비교

// 문자열
expect(str).toMatch(/정규식/);
expect(str).toContain("부분 문자열");

// 배열
expect(array).toContain(item);
expect(array).toHaveLength(3);

// 객체
expect(obj).toHaveProperty("key");
expect(obj).toMatchObject({ key: "value" });

// 에러
expect(() => func()).toThrow();
expect(() => func()).toThrow("에러 메시지");

// 비동기
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

### 비동기 테스트

```typescript
// async/await 사용
it("비동기 함수 테스트", async () => {
  const result = await asyncFunction();
  expect(result).toBe("expected");
});

// Promise 사용
it("비동기 함수 테스트", () => {
  return asyncFunction().then((result) => {
    expect(result).toBe("expected");
  });
});
```

## 현재 테스트 파일 구조

```
src/__tests__/
├── api-error.test.ts              ✅ APIError 클래스 테스트 (14개)
├── api-handler.test.ts            ⚠️  API 핸들러 테스트 (일부 실패)
├── inventory.test.ts              ✅ 재고 계산 로직 테스트 (8개)
├── transaction-notification.test.ts ✅ 트랜잭션 알림 테스트 (12개)
├── product-icon.test.ts           ✅ 제품 아이콘 URL 테스트 (11개)
├── InventoryList.test.tsx         ✅ 컴포넌트 테스트
├── api.test.ts                    ❌ 파일 경로 오류 (수정 필요)
└── useInventory.test.ts           ❌ 파일 경로 오류 (수정 필요)
```

## 테스트 작성 예시

### 유틸리티 함수 테스트

```typescript
import { calculateTotal } from "@/utils/calculator";

describe("calculateTotal", () => {
  it("배열의 합을 계산한다", () => {
    const numbers = [1, 2, 3, 4, 5];
    const result = calculateTotal(numbers);
    expect(result).toBe(15);
  });

  it("빈 배열은 0을 반환한다", () => {
    const result = calculateTotal([]);
    expect(result).toBe(0);
  });
});
```

### API 에러 핸들링 테스트

```typescript
import { APIError } from "@/utils/api-error";

describe("APIError", () => {
  it("400 에러를 생성한다", () => {
    const error = APIError.badRequest("잘못된 요청");
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("잘못된 요청");
  });
});
```

### 모킹이 필요한 함수 테스트

```typescript
import { sendNotification } from "@/utils/notification";
import { sendPushNotification } from "@/services/push-notification";

jest.mock("@/services/push-notification");

describe("sendNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("알림을 전송한다", async () => {
    (sendPushNotification as jest.Mock).mockResolvedValue(true);
    
    const result = await sendNotification({ title: "테스트" });
    
    expect(result).toBe(true);
    expect(sendPushNotification).toHaveBeenCalledWith({
      title: "테스트",
    });
  });
});
```

## 디버깅 팁

### 1. 특정 테스트만 실행

```bash
npm test -- -t "테스트 이름"
```

### 2. 테스트 실패 시 상세 정보

```bash
npm test -- --verbose --no-coverage
```

### 3. 테스트 파일 경로 확인

```bash
npm test -- --listTests
```

### 4. 캐시 클리어

```bash
npm test -- --clearCache
```

## 베스트 프랙티스

1. **AAA 패턴 사용**: Arrange (준비) → Act (실행) → Assert (검증)
2. **테스트는 독립적으로**: 각 테스트는 다른 테스트에 의존하지 않아야 함
3. **명확한 테스트 이름**: "should return true when..." 형식 사용
4. **모킹 최소화**: 실제 구현을 테스트하는 것이 좋지만, 외부 의존성은 모킹
5. **에러 케이스 테스트**: 성공 케이스뿐만 아니라 실패 케이스도 테스트
6. **경계값 테스트**: null, undefined, 빈 배열 등 경계값 테스트

## CI/CD 통합

GitHub Actions 예시:

```yaml
- name: Run tests
  run: npm test -- --coverage --ci
```

## 참고 자료

- [Jest 공식 문서](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)

