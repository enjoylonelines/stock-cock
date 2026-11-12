import { fireEvent, render, screen } from "@testing-library/react";
import TransactionList from "@/app/transactions/_components/TransactionList";
import type { TransactionHistoryItem } from "@/hooks/useTransactionHistory";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("next/image", () => () => null);
jest.mock("next/link", () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("@/hooks/useProducts", () => ({ useProducts: () => ({ products: [] }) }));

const item = (overrides: Partial<TransactionHistoryItem> = {}): TransactionHistoryItem =>
  ({
    transaction_id: "transaction-1",
    product_option_id: "option-1",
    product_name: "검증 제품",
    type: "in",
    transaction_status: "posted",
    entry_kind: "original",
    type_kr: "입고",
    created_at: "2026-11-06T10:00:00",
    quantity: 2,
    total_stock: 2,
    memo: "상세를 누르지 않아도 보이는 메모",
    product_type: "company",
    ...overrides,
  }) as TransactionHistoryItem;

test("다품목 거래의 메모는 접힌 목록에서도 한 번만 보인다", () => {
  render(
    <TransactionList
      grouped={[
        {
          date: "2026년 11월 6일",
          transactions: [item(), item({ product_option_id: "option-2", product_name: "다른 제품" })],
        },
      ]}
    />
  );
  expect(screen.getAllByText("상세를 누르지 않아도 보이는 메모")).toHaveLength(1);
  expect(screen.getByText("외 1개")).toBeInTheDocument();
});

test("비어 있는 메모는 목록 공간을 차지하지 않는다", () => {
  render(<TransactionList grouped={[{ date: "2026년 11월 6일", transactions: [item({ memo: "  " })] }]} />);
  expect(screen.queryByText("메모")).not.toBeInTheDocument();
});

test("삭제된 원재료도 이력 자체의 제품 유형으로 g 단위를 유지한다", () => {
  render(
    <TransactionList
      grouped={[
        {
          date: "2026년 11월 6일",
          transactions: [item({ product_type: "material", quantity: 2500, total_stock: 2500 })],
        },
      ]}
    />
  );
  expect(screen.getByText("+2.5kg")).toBeInTheDocument();
});

test("날짜 정정 후 기본 목록에는 새 거래일만 남고 거래일 내림차순으로 표시한다", () => {
  render(<TransactionList grouped={[
    { date: "2026년 10월 29일", transactions: [item({ transaction_id: "replacement", created_at: "2026-10-29T00:00:00", entry_kind: "replacement" })] },
    { date: "2026년 11월 29일", transactions: [item({ transaction_status: "corrected", created_at: "2026-11-29T00:00:00" })] },
    { date: "2026년 11월 12일", transactions: [item({ transaction_id: "reverse", entry_kind: "reversal", created_at: "2026-11-12T00:00:00" })] },
    { date: "2026년 10월 30일", transactions: [item({ transaction_id: "other", created_at: "2026-10-30T00:00:00" })] },
  ]} />);
  expect(screen.getAllByRole("heading", { level: 2 }).map(node => node.textContent)).toEqual(["2026년 10월 30일", "2026년 10월 29일"]);
  fireEvent.click(screen.getByRole("checkbox", { name: "변경 이력 포함" }));
  expect(screen.getByText("2026년 11월 29일")).toBeInTheDocument();
});

test("정정된 원본과 역거래는 남아 있지만 다시 처리할 수 없다", () => {
  render(<TransactionList grouped={[{ date: "2026년 11월 9일", transactions: [
    item({ transaction_status: "corrected", resolved_by_transaction_id: "replacement" }),
    item({ transaction_id: "reversal", entry_kind: "reversal", type: "out", type_kr: "출고" }),
  ] }]} />);
  expect(screen.queryByText("정정됨")).not.toBeInTheDocument();
  expect(screen.queryByText("역거래")).not.toBeInTheDocument();
  expect(screen.queryByText("2026년 11월 9일")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "변경 이력 포함" }));
  expect(screen.getByText("정정됨")).toBeInTheDocument();
  expect(screen.getByText("역거래")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "정정" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "취소" })).not.toBeInTheDocument();
  expect(screen.getAllByText("현재 재고:", { exact: false })).toHaveLength(2);
});
