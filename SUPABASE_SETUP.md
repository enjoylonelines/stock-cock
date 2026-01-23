# Supabase CLI 연동 가이드

## 1. Supabase CLI 로그인

```bash
npx supabase login
```

브라우저가 열리면 Supabase 계정으로 로그인하세요.

## 2. 원격 프로젝트와 연결

프로젝트 목록 확인:
```bash
npx supabase projects list
```

원격 프로젝트와 연결:
```bash
npx supabase link --project-ref <your-project-ref>
```

프로젝트 참조 ID는 Supabase 대시보드의 프로젝트 설정에서 확인할 수 있습니다.

## 3. 마이그레이션 관리

### 로컬에서 마이그레이션 실행
```bash
npm run db:migrate
# 또는
npx supabase db push
```

### 새로운 마이그레이션 생성
```bash
npm run db:new-migration
# 또는
npx supabase migration new <migration-name>
```

### 데이터베이스 차이 확인 (Docker 필요)
⚠️ **주의**: 이 명령어는 Docker가 필요합니다.

```bash
npm run db:diff
# 또는
npx supabase db diff --linked
```

### 원격 DB 스키마 가져오기 (⚠️ Docker 필요)
⚠️ **주의**: `db pull` 명령어는 Docker가 필요합니다.

원격 데이터베이스의 현재 스키마를 마이그레이션 파일로 가져옵니다:
```bash
npm run db:pull <migration-name>
# 또는
npx supabase db pull <migration-name>
```

**Docker 없이 스키마 확인하는 방법:**
1. Supabase 대시보드 > SQL Editor에서 스키마 확인
2. 또는 `npx supabase gen types typescript --linked`로 타입 생성하여 스키마 구조 파악

## 4. 로컬 개발 환경 실행 (선택사항)

Docker가 설치되어 있어야 합니다.

```bash
npm run db:start
# 또는
npx supabase start
```

로컬 Supabase가 실행되면:
- API: http://127.0.0.1:54321
- Studio: http://127.0.0.1:54323
- DB: postgresql://postgres:postgres@127.0.0.1:54322/postgres

## 5. 환경 변수 설정

`.env.local` 파일에 다음 변수들을 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_ACCESS_TOKEN=your-access-token  # CLI 사용 시 필요
```

## 유용한 명령어

### Docker 불필요한 명령어
- `npm run db:migrate` - 로컬 마이그레이션을 원격 DB에 적용
- `npm run db:pull` - 원격 DB 스키마를 마이그레이션으로 가져오기
- `npx supabase projects list` - 연결된 프로젝트 목록 확인

### Docker 필요한 명령어
- `npm run db:start` - 로컬 Supabase 시작 (Docker 필요)
- `npm run db:stop` - 로컬 Supabase 중지
- `npm run db:reset` - 로컬 데이터베이스 리셋
- `npm run db:diff` - 데이터베이스 차이 확인 (shadow database 생성 필요)

## Docker 설치 (선택사항)

로컬 개발 환경을 사용하려면 Docker Desktop이 필요합니다:
- macOS: https://docs.docker.com/desktop/install/mac-install/
- 설치 후 Docker Desktop을 실행해야 합니다.
