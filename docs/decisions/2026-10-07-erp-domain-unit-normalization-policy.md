# ERP inventory unit normalization policy

Date: 2026-10-07  
Scope: isolated ECOUNT ERP Domain Lab only.

## Decision

- 완제품 `finished-001`, `finished-002`의 기준 단위는 `EA`이며 `EA = 1 EA`만 허용한다.
- 포장 완제품 `finished-box-001`의 기준 단위는 `EA`이며 `EA = 1 EA`, `BOX = 24 EA`를 허용한다.
- 원재료 `material-001`의 기준 단위는 `g`이며 `g = 1 g`, `kg = 1000 g`만 허용한다.
- 전표 입력은 원 입력 수량과 단위를 보존하지만, 원장과 현재고 projection에는 언제나 기준 단위 수량만 기록한다.
- 등록되지 않은 품목 단위 조합은 `INVALID_DOCUMENT_UNIT`으로 거절한다.

## Evidence

`labs/erp-domain/ecount/evidence/2026-10-07-posting-v9-package-normalization.json`에서 원재료 `2 kg` 입고가 `2000 g`으로 기록됐고, `500 g` 출고 뒤 현재고가 `1500 g`이 됐다. 포장 완제품 `2 BOX`는 `48 EA`로 기록됐고, `12 EA` 출고 뒤 현재고가 `36 EA`가 됐다. 허용되지 않은 단위 입력은 거절됐다.

## Boundary

이것은 수량 단위의 정규화만 다룬다. 포장 단위, 수율, BOM 소요량, lot, 밀도 기반 질량/부피 변환, 단위 변경 이력, 원가 계산은 포함하지 않는다. 반품은 현재 원 출고 항목의 기준 단위 수량을 참조하며, 별도 입력 단위 변환은 다음 도메인 확장 전까지 지원하지 않는다.
