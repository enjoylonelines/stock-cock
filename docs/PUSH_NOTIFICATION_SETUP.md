# 웹 푸시 알림 설정 가이드

## 1. 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# 사이트 URL (프로덕션에서는 실제 도메인으로 변경)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 2. 데이터베이스 마이그레이션 실행

Supabase에서 다음 마이그레이션을 실행하세요:

```sql
-- 푸시 알림 구독 정보 테이블
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 인덱스 생성
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- RLS 정책 설정
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 푸시 구독만 관리할 수 있음
CREATE POLICY "사용자는 자신의 푸시 구독만 관리할 수 있음" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- updated_at 트리거 추가
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 3. 기능 설명

### 구현된 기능:

- ✅ 브라우저 푸시 알림 권한 요청
- ✅ 푸시 구독 생성/해제
- ✅ 입출고 시 푸시 알림 전송
- ✅ 제품 등록 시 푸시 알림 전송
- ✅ 재고 이동 시 푸시 알림 전송
- ✅ 재고 조정 시 푸시 알림 전송
- ✅ 설정 페이지에서 푸시 알림 관리
- ✅ 실시간 알람 업데이트

### 알림 종류:

1. **입고 완료**: "X개 제품이 입고되었습니다"
2. **출고 완료**: "X개 제품이 출고되었습니다"
3. **새 제품 등록**: "X 제품이 등록되었습니다 (Y개 옵션)"
4. **재고 이동 완료**: "X개 제품이 이동되었습니다"
5. **재고 조정 완료**: "X개 제품의 재고가 조정되었습니다"

### 사용 방법:

1. 설정 페이지에서 푸시 알림을 활성화
2. 브라우저에서 알림 권한 허용
3. 입출고, 제품 등록 등의 작업 수행 시 자동으로 알림 수신

## 4. 주의사항

- HTTPS 환경에서만 푸시 알림이 작동합니다
- 개발 환경에서는 `localhost`에서도 작동합니다
- 브라우저별로 푸시 알림 지원 여부가 다릅니다
- 사용자가 알림을 차단한 경우 설정 페이지에서 안내 메시지가 표시됩니다

## 5. 문제 해결

### 알림이 오지 않는 경우:

1. 브라우저 설정에서 알림이 허용되어 있는지 확인
2. Service Worker가 정상적으로 등록되었는지 확인
3. VAPID 키가 올바르게 설정되었는지 확인
4. 데이터베이스에 구독 정보가 저장되었는지 확인

### 개발자 도구에서 확인할 수 있는 정보:

- Console에서 푸시 알림 관련 로그 확인
- Application 탭 > Service Workers에서 SW 상태 확인
- Application 탭 > Storage > IndexedDB에서 구독 정보 확인
