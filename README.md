# Stock Cock - 재고 관리 시스템

Next.js 16 기반의 재고 관리 시스템입니다.

## 🚀 시작하기

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 빌드
pnpm build
```

> **Note**: This project uses [pnpm](https://pnpm.io/) as the package manager. If you don't have pnpm installed, you can install it with `npm install -g pnpm`.

## 📁 프로젝트 구조

이 프로젝트는 Feature별로 구조화되어 있습니다:

```
src/
├── components/          # 공용 컴포넌트
├── app/                 # Feature별 구조화
│   ├── products/        # 제품 관리
│   ├── inventory/       # 재고 관리
│   ├── transactions/    # 입출고 관리
│   ├── home/           # 홈
│   ├── settings/       # 설정
│   └── auth/          # 인증
├── lib/                # 공용 비즈니스 로직
├── utils/              # 공용 유틸리티
├── services/           # 공용 서비스
└── hooks/              # 공용 훅
```

자세한 구조는 [docs/FINAL_ARCHITECTURE.md](./docs/FINAL_ARCHITECTURE.md)를 참고하세요.

## 📚 문서

모든 문서는 `docs/` 폴더에 있습니다:

- [최종 아키텍처](./docs/FINAL_ARCHITECTURE.md) - 프로젝트 구조 및 최적화 지표
- [리팩토링 요약](./docs/REFACTORING_SUMMARY.md) - 리팩토링 작업 요약
- [리팩토링 최종 구조](./docs/REFACTORING_FINAL_STRUCTURE.md) - 최종 디렉토리 구조
- [성능 리포트](./docs/PERFORMANCE_REPORT.md) - 성능 최적화 리포트
- [코드 최적화 리포트](./docs/CODE_OPTIMIZATION_REPORT.md) - 코드 최적화 리포트

## 🛠️ 기술 스택

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: SWR
- **Database**: Supabase
- **Package Manager**: pnpm

## 📝 라이선스

MIT
