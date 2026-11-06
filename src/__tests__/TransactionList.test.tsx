import { render, screen } from "@testing-library/react";
import TransactionList from "@/app/transactions/_components/TransactionList";
import type { TransactionHistoryItem } from "@/hooks/useTransactionHistory";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("next/image", () => () => null);
jest.mock("@/hooks/useProducts", () => ({ useProducts: () => ({ products: [] }) }));

const item = (overrides: Partial<TransactionHistoryItem> = {}): TransactionHistoryItem =>
  ({
    transaction_id: "transaction-1",
    product_option_id: "option-1",
    product_name: "검증 제품",
    type: "in",
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
