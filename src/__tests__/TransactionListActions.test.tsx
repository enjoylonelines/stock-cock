import TransactionListActions from "@/app/transactions/_components/TransactionListActions";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { mutate } from "swr";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
jest.mock("swr", () => ({ mutate: jest.fn().mockResolvedValue(undefined) }));

const preview = {
  revision: 7,
  transaction_status: "posted",
  entry_kind: "original",
  type: "in",
  created_at: "2026-11-09T10:00:00",
  memo: "확인용 메모",
  transaction_items: [{}, {}],
};
const response = (ok: boolean, data: unknown) => ({ ok, json: async () => data });

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  Object.defineProperty(global.crypto, "randomUUID", { configurable: true, value: () => "request-test" });
});

test("정정은 해당 이력의 정정 폼으로 바로 이동한다", () => {
  render(<TransactionListActions transactionId="transaction-1" />);
  fireEvent.click(screen.getByRole("button", { name: "정정" }));
  expect(mockPush).toHaveBeenCalledWith("/transactions/transaction-1?correct=true");
  expect(fetch).not.toHaveBeenCalled();
});

test("취소 확인 전에는 이력을 조회만 하고 취소하면 취소하지 않는다", async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(true, { data: preview }));
  render(<TransactionListActions transactionId="transaction-1" />);
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(await screen.findByText("확인용 메모")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "닫기" }));
  expect(screen.queryByRole("button", { name: "취소 확인" })).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("확인한 revision으로 취소하고 목록·재고를 갱신한다", async () => {
  (fetch as jest.Mock)
    .mockResolvedValueOnce(response(true, { data: preview }))
    .mockResolvedValueOnce(response(true, { success: true }));
  render(<TransactionListActions transactionId="transaction-1" />);
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  await screen.findByRole("button", { name: "취소 확인" });
  fireEvent.change(screen.getByLabelText("취소 사유"), { target: { value: "입력 오류" } });
  fireEvent.click(screen.getByRole("button", { name: "취소 확인" }));
  await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/transactions/transaction-1/corrections",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ revision: 7, action: "cancel", reason: "입력 오류", request_id: "request-test" }),
    })
  );
  expect(mutate).toHaveBeenCalledTimes(1);
});

test("재고 부족이나 충돌 오류는 화면에 남기고 성공으로 처리하지 않는다", async () => {
  (fetch as jest.Mock)
    .mockResolvedValueOnce(response(true, { data: preview }))
    .mockResolvedValueOnce(response(false, { error: "변경 후 재고가 부족합니다." }));
  render(<TransactionListActions transactionId="transaction-1" />);
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  await screen.findByRole("button", { name: "취소 확인" });
  fireEvent.change(screen.getByLabelText("취소 사유"), { target: { value: "입력 오류" } });
  fireEvent.click(screen.getByRole("button", { name: "취소 확인" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("변경 후 재고가 부족합니다.");
  expect(mutate).not.toHaveBeenCalled();
  expect(mockRefresh).not.toHaveBeenCalled();
});

test("취소 사유가 없으면 요청을 보내지 않는다", async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(true, { data: preview }));
  render(<TransactionListActions transactionId="transaction-1" />);
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  fireEvent.click(await screen.findByRole("button", { name: "취소 확인" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("취소 사유");
  expect(fetch).toHaveBeenCalledTimes(1);
});
