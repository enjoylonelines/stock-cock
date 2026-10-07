# ERP unit-entry response contract

Date: 2026-10-07  
Scope: isolated ERP Domain Lab presentation contract. This is not yet a route or screen in the existing Stock-Cock application.

## Direct document submission

If the database rejects a unit, the API adapter should map `22023 / INVALID_DOCUMENT_UNIT` to HTTP `400` with a line-level payload:

```json
{
  "code": "INVALID_DOCUMENT_UNIT",
  "lineIndex": 3,
  "message": "material-001의 입력 단위를 g, kg 중 하나로 바꿔 주세요.",
  "allowedUnits": ["g", "kg"],
  "baseUnit": "g"
}
```

The client keeps the entered quantity and unit in the form, marks only that line
as invalid, and offers the listed units. It must not silently convert an
incompatible dimensional unit such as `EA → g`.

```text
품목              수량       입력 단위       기준 단위      상태
material-001      2          [ EA ▼ ]        g              오류

EA는 material-001에 사용할 수 없습니다.
허용 단위: g, kg · 1 kg = 1,000 g
[단위를 수정] [행 삭제] [저장]
```

For a valid selection, show a non-authoritative preview such as `2 kg → 2000 g`.
The server remains the authority at submission time.

## Bulk receipt

Keep successful rows and show rejected rows in a result table with their row
index, code, and reason. The user corrects and resubmits only rejected rows.
Because a rejected row creates no document, its idempotency key can be reused
after correction.
