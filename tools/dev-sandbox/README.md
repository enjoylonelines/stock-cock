# 기능 검증용 개발 환경

기존 .env.local과 stock-cock DB는 변경하지 않는다. 별도 Supabase 프로젝트 stock-cock-management-dev(API 55321, DB 55322)를 사용한다. 테스트 데이터만 생성한다.

저장소 루트에서 실행:

```sh
node tools/dev-sandbox/setup.mjs
node tools/dev-sandbox/start.mjs
node tools/dev-sandbox/verify.mjs
node tools/dev-sandbox/build.mjs
pnpm test -- --runInBand src/__tests__/TransactionList.test.tsx
pnpm exec tsc --noEmit -p tools/dev-sandbox/tsconfig.json
```

- 개발 화면: http://localhost:3000
- 검증 계정은 실행할 때 임의로 생성하며 비밀번호는 출력하지 않는다. 직접 로그인할 계정이 필요하면 MANAGEMENT_DEV_EMAIL과 MANAGEMENT_DEV_PASSWORD 환경 변수로 로컬에서 지정한다. 운영 계정은 사용하지 않는다.
- verify는 반복할 때마다 새 테스트 제품·창고·입출고를 추가한다. 운영 데이터에는 사용하지 않는다.
- Next 서버는 백그라운드 실행하며 PID는 /tmp/stock-cock-management-dev.pid, 로그는 /tmp/stock-cock-management-dev.log에 둔다.
- 서버 중지: 해당 PID의 프로세스를 종료한다. DB 중지: pnpm dlx supabase stop --workdir tools/dev-sandbox.
- 스토리지·실시간 구독·푸시는 이 경량 검증 환경에서 실행하지 않는다. 이미지 업로드, 다른 기기의 실시간 반영, 푸시 알림은 별도 검증이 필요하다.
- webpack 빌드는 PWA 산출물 public/sw.js를 갱신할 수 있다. 빌드 이후 변경 범위를 확인하여 생성물만의 변경이 섞이지 않게 한다.
- 운영 적용 시 앱 배포 전에 신규 마이그레이션을 검토·적용해야 한다. 기존 DB의 실제 스키마와의 일치는 아직 검증하지 않았다.
