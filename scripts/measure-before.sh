#!/bin/bash

# 리팩토링 전 상태 측정 스크립트
# 사용법: bash scripts/measure-before.sh
# 자동으로 REFACTORING_METRICS.md 파일의 Before 섹션을 업데이트합니다.

METRICS_FILE="REFACTORING_METRICS.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=================================="
echo "리팩토링 전 코드 메트릭 측정"
echo "=================================="
echo ""

# 1. 파일 및 라인 수
echo "📁 코드 규모 측정 중..."
TS_FILES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l | tr -d ' ')
TOTAL_LINES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
echo "  ✓ TypeScript/TSX 파일 수: $TS_FILES"
echo "  ✓ 총 코드 라인 수: $TOTAL_LINES"

# 2. 함수/컴포넌트 수
echo "⚙️  함수 및 컴포넌트 측정 중..."
FUNCTIONS=$(grep -rE "^(function|const|export|class)\s+\w+" src --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
echo "  ✓ 함수/컴포넌트/클래스 수: $FUNCTIONS"

# 3. console.log/error 개수
echo "🐛 디버깅 코드 측정 중..."
CONSOLE_LOGS=$(grep -r "console\." src --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
echo "  ✓ console.log/error/warn 개수: $CONSOLE_LOGS"

# 4. 테스트 파일
echo "🧪 테스트 측정 중..."
TEST_FILES=$(find src -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l | tr -d ' ')
TEST_SPECS=$(find src -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | xargs grep -h "describe\|it\|test" 2>/dev/null | wc -l | tr -d ' ')
echo "  ✓ 테스트 파일 수: $TEST_FILES"
echo "  ✓ 테스트 케이스 수: $TEST_SPECS"

# 5. API 라우트
echo "🌐 API 라우트 측정 중..."
API_ROUTES=$(find src/app/api -type f -name "route.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "  ✓ API 라우트 수: $API_ROUTES"

# 6. Custom Hooks
echo "🪝 Custom Hooks 측정 중..."
HOOKS=$(find src/hooks -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "  ✓ Custom Hook 파일 수: $HOOKS"

# 7. useEffect 사용
echo "🔄 useEffect 사용 측정 중..."
USE_EFFECTS=$(grep -r "useEffect" src --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
echo "  ✓ useEffect 사용 횟수: $USE_EFFECTS"

# 8. TODO/FIXME
echo "📝 TODO/FIXME 측정 중..."
TODOS=$(grep -ri "TODO\|FIXME\|HACK\|XXX" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "  ✓ TODO/FIXME 개수: $TODOS"

# 9. 중복 가능성 체크
echo "🔄 잠재적 중복 코드 측정 중..."
DUPLICATE_UPDATE_INVENTORY=$(grep -r "function updateInventory\|const updateInventory" src --include="*.ts" | wc -l | tr -d ' ')
PUSH_NOTIFICATION_CALLS=$(grep -r "/api/push/send" src --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
echo "  ✓ updateInventory 함수: $DUPLICATE_UPDATE_INVENTORY개"
echo "  ✓ 푸시 알림 전송 로직: $PUSH_NOTIFICATION_CALLS개"

# 10. 타입 안정성
echo "🔒 타입 안정성 측정 중..."
ANY_USAGE=$(grep -r ": any\|as any" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "  ✓ any 타입 사용: $ANY_USAGE"

echo ""
echo "📝 REFACTORING_METRICS.md 파일 업데이트 중..."

# 백업 생성
cp "$METRICS_FILE" "${METRICS_FILE}.bak"

# Before 섹션 업데이트
# macOS와 Linux 모두 호환되는 sed 명령어 사용
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/- \*\*총 파일 수\*\*: [0-9]*개/- **총 파일 수**: ${TS_FILES}개/" "$METRICS_FILE"
    sed -i '' "s/- \*\*총 코드 라인 수\*\*: [0-9,]*줄/- **총 코드 라인 수**: $(printf "%'d" $TOTAL_LINES)줄/" "$METRICS_FILE"
    sed -i '' "s/- \*\*함수\/컴포넌트 수\*\*: [0-9]*개/- **함수\/컴포넌트 수**: ${FUNCTIONS}개/" "$METRICS_FILE"
    sed -i '' "s/- \*\*console\.log\/error 개수\*\*: [0-9]*개/- **console.log\/error 개수**: ${CONSOLE_LOGS}개/" "$METRICS_FILE"
    sed -i '' "s/- \*\*테스트 파일 수\*\*: [0-9]*개/- **테스트 파일 수**: ${TEST_FILES}개/" "$METRICS_FILE"
    sed -i '' "s/- \*\*테스트 케이스 수\*\*: [0-9]*개/- **테스트 케이스 수**: ${TEST_SPECS}개/" "$METRICS_FILE"
    sed -i '' "s/- \*\*총 훅 개수\*\*: [0-9]*개/- **총 훅 개수**: ${HOOKS}개/" "$METRICS_FILE"
    sed -i '' "s/- \*\*총 API 라우트 수\*\*: [0-9]*개/- **총 API 라우트 수**: ${API_ROUTES}개/" "$METRICS_FILE"
    sed -i '' "s/- \*\*useEffect 사용 횟수\*\*: [0-9]*개/- **useEffect 사용 횟수**: ${USE_EFFECTS}개/" "$METRICS_FILE"
    sed -i '' "s/- \*\*TODO\/FIXME 개수\*\*: [0-9]*개/- **TODO\/FIXME 개수**: ${TODOS}개/" "$METRICS_FILE"
    sed -i '' "s/- \*\*중복된 updateInventory 함수\*\*: [0-9]*개/- **중복된 updateInventory 함수**: ${DUPLICATE_UPDATE_INVENTORY}개/" "$METRICS_FILE"
    sed -i '' "s/- \*\*중복된 푸시 알림 전송 로직\*\*: [0-9]*개/- **중복된 푸시 알림 전송 로직**: ${PUSH_NOTIFICATION_CALLS}개/" "$METRICS_FILE"
    # 중복 코드 부분은 이미 위에서 업데이트됨
    sed -i '' "s/\*\*중복된 updateInventory 함수\*\*: [0-9]*개/\*\*중복된 updateInventory 함수\*\*: ${DUPLICATE_UPDATE_INVENTORY}개/" "$METRICS_FILE"
    sed -i '' "s/\*\*중복된 푸시 알림 전송 로직\*\*: [0-9]*개/\*\*중복된 푸시 알림 전송 로직\*\*: ${PUSH_NOTIFICATION_CALLS}개/" "$METRICS_FILE"
    sed -i '' "s/- \*\*any 타입 사용\*\*: [0-9]*개/- **any 타입 사용**: ${ANY_USAGE}개/" "$METRICS_FILE"
else
    # Linux
    sed -i "s/- \*\*총 파일 수\*\*: [0-9]*개/- **총 파일 수**: ${TS_FILES}개/" "$METRICS_FILE"
    sed -i "s/- \*\*총 코드 라인 수\*\*: [0-9,]*줄/- **총 코드 라인 수**: $(printf "%'d" $TOTAL_LINES)줄/" "$METRICS_FILE"
    sed -i "s/- \*\*함수\/컴포넌트 수\*\*: [0-9]*개/- **함수\/컴포넌트 수**: ${FUNCTIONS}개/" "$METRICS_FILE"
    sed -i "s/- \*\*console\.log\/error 개수\*\*: [0-9]*개/- **console.log\/error 개수**: ${CONSOLE_LOGS}개/" "$METRICS_FILE"
    sed -i "s/- \*\*테스트 파일 수\*\*: [0-9]*개/- **테스트 파일 수**: ${TEST_FILES}개/" "$METRICS_FILE"
    sed -i "s/- \*\*테스트 케이스 수\*\*: [0-9]*개/- **테스트 케이스 수**: ${TEST_SPECS}개/" "$METRICS_FILE"
    sed -i "s/- \*\*총 훅 개수\*\*: [0-9]*개/- **총 훅 개수**: ${HOOKS}개/" "$METRICS_FILE"
    sed -i "s/- \*\*총 API 라우트 수\*\*: [0-9]*개/- **총 API 라우트 수**: ${API_ROUTES}개/" "$METRICS_FILE"
    sed -i "s/- \*\*useEffect 사용 횟수\*\*: [0-9]*개/- **useEffect 사용 횟수**: ${USE_EFFECTS}개/" "$METRICS_FILE"
    sed -i "s/- \*\*TODO\/FIXME 개수\*\*: [0-9]*개/- **TODO\/FIXME 개수**: ${TODOS}개/" "$METRICS_FILE"
    sed -i "s/- \*\*중복된 updateInventory 함수\*\*: [0-9]*개/- **중복된 updateInventory 함수**: ${DUPLICATE_UPDATE_INVENTORY}개/" "$METRICS_FILE"
    sed -i "s/- \*\*중복된 푸시 알림 전송 로직\*\*: [0-9]*개/- **중복된 푸시 알림 전송 로직**: ${PUSH_NOTIFICATION_CALLS}개/" "$METRICS_FILE"
    # 중복 코드 부분은 이미 위에서 업데이트됨
    sed -i "s/\*\*중복된 updateInventory 함수\*\*: [0-9]*개/\*\*중복된 updateInventory 함수\*\*: ${DUPLICATE_UPDATE_INVENTORY}개/" "$METRICS_FILE"
    sed -i "s/\*\*중복된 푸시 알림 전송 로직\*\*: [0-9]*개/\*\*중복된 푸시 알림 전송 로직\*\*: ${PUSH_NOTIFICATION_CALLS}개/" "$METRICS_FILE"
    sed -i "s/- \*\*any 타입 사용\*\*: [0-9]*개/- **any 타입 사용**: ${ANY_USAGE}개/" "$METRICS_FILE"
fi

# 타임스탬프 추가 (파일 상단에)
if ! grep -q "마지막 업데이트" "$METRICS_FILE"; then
    sed -i '' "1a\\
\\
<!-- 마지막 업데이트: ${TIMESTAMP} -->\\
" "$METRICS_FILE" 2>/dev/null || sed -i "1a\\\n<!-- 마지막 업데이트: ${TIMESTAMP} -->\n" "$METRICS_FILE"
fi

echo "=================================="
echo "✅ 측정 완료 및 파일 업데이트 완료!"
echo "=================================="
echo ""
echo "📄 업데이트된 파일: $METRICS_FILE"
echo "💾 백업 파일: ${METRICS_FILE}.bak"
echo "🕐 측정 시각: $TIMESTAMP"
echo ""
echo "Before 섹션이 자동으로 업데이트되었습니다!"

