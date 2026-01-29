# 모바일 개발 가이드

모바일 키보드 이벤트 및 뷰포트 수정을 개발 서버에서 테스트하는 방법입니다.

## 방법 1: 실제 모바일 기기에서 접속 (권장) ✅

### 1. 개발 서버 실행 (모바일 접속 가능)

```bash
# 모바일 접속 가능한 개발 서버 실행
pnpm dev:mobile

# 또는 직접 실행
next dev --turbopack -H 0.0.0.0
```

### 2. 로컬 IP 주소 확인

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# 또는
ipconfig getifaddr en0  # macOS (Wi-Fi)
```

현재 로컬 IP: **172.30.1.41** (변경될 수 있음)

### 3. 모바일 기기에서 접속

1. **같은 Wi-Fi 네트워크에 연결** (Mac과 모바일 기기 모두)
2. 모바일 브라우저에서 접속:
   ```
   http://172.30.1.41:3000
   ```
   ⚠️ IP 주소는 환경에 따라 다를 수 있습니다.

### 4. 키보드 이벤트 테스트

- 입력 필드 클릭 → 키보드 열림 → `visualViewport` 이벤트 확인
- 키보드 닫기 → 뷰포트 복원 확인
- Drawer 높이 복원 동작 확인

---

## 방법 2: Chrome DevTools 모바일 에뮬레이션 (제한적)

### 장점
- 빠른 테스트
- 네트워크 설정 불필요

### 단점
- **키보드 이벤트가 실제와 다름** ⚠️
- `visualViewport` API 동작이 실제 기기와 다를 수 있음
- 뷰포트 수정이 정확히 반영되지 않을 수 있음

### 사용 방법

1. Chrome DevTools 열기 (F12)
2. 디바이스 툴바 토글 (Cmd+Shift+M / Ctrl+Shift+M)
3. 모바일 기기 선택 (iPhone, Android 등)
4. **"Show device frame"** 옵션 활성화
5. **"Throttling"** 설정 (네트워크 속도 시뮬레이션)

---

## 방법 3: USB 디버깅 (Android)

### Android Chrome Remote Debugging

1. Android 기기에서 USB 디버깅 활성화
2. USB로 Mac에 연결
3. Chrome에서 `chrome://inspect` 접속
4. 기기 선택 → "inspect" 클릭
5. 실시간으로 모바일 화면 확인 및 디버깅

---

## 방법 4: 터널링 서비스 (외부 접속 필요 시)

### ngrok 사용

```bash
# ngrok 설치
brew install ngrok

# 개발 서버 실행
pnpm dev

# 다른 터미널에서 ngrok 실행
ngrok http 3000
```

ngrok이 제공하는 URL로 모바일에서 접속 가능합니다.

---

## 디버깅 팁

### 1. visualViewport 이벤트 확인

모바일 브라우저 콘솔에서:

```javascript
// visualViewport 크기 확인
console.log('Viewport height:', window.visualViewport?.height);
console.log('Window height:', window.innerHeight);

// 이벤트 리스너 추가
window.visualViewport?.addEventListener('resize', () => {
  console.log('Viewport resized:', {
    height: window.visualViewport.height,
    width: window.visualViewport.width,
    scale: window.visualViewport.scale
  });
});
```

### 2. 뷰포트 변경 감지

```javascript
// 키보드 열림/닫힘 감지
let lastHeight = window.visualViewport?.height || window.innerHeight;

window.visualViewport?.addEventListener('resize', () => {
  const currentHeight = window.visualViewport.height;
  const diff = lastHeight - currentHeight;
  
  if (diff > 150) {
    console.log('키보드 열림');
  } else if (diff < -150) {
    console.log('키보드 닫힘');
  }
  
  lastHeight = currentHeight;
});
```

### 3. 현재 구현 확인

프로젝트에서 사용 중인 코드:
- `src/components/home/CommonDrawer.tsx` - visualViewport API 사용
- Drawer 높이 자동 복원 로직

---

## 주의사항

1. **방화벽 설정**: Mac 방화벽이 로컬 네트워크 접속을 차단할 수 있음
2. **HTTPS 필요 시**: PWA 기능 테스트 시 HTTPS 필요 (ngrok 사용)
3. **네트워크 보안**: 로컬 네트워크에서만 접속 가능하도록 주의

---

## 빠른 시작

```bash
# 1. 모바일 접속 가능한 개발 서버 실행
pnpm dev:mobile

# 2. 로컬 IP 확인
ifconfig | grep "inet " | grep -v 127.0.0.1

# 3. 모바일 브라우저에서 접속
# http://[로컬IP]:3000
```

---

## 문제 해결

### 모바일에서 접속이 안 될 때

1. **방화벽 확인**
   ```bash
   # macOS 방화벽 설정 확인
   System Settings > Network > Firewall
   ```

2. **포트 확인**
   ```bash
   # 3000 포트가 열려있는지 확인
   lsof -i :3000
   ```

3. **네트워크 확인**
   - Mac과 모바일이 같은 Wi-Fi에 연결되어 있는지 확인
   - VPN이 켜져있으면 끄기

4. **다른 포트 사용**
   ```bash
   next dev --turbopack -H 0.0.0.0 -p 3001
   ```
