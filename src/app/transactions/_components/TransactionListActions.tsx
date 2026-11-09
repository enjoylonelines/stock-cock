"use client";

import { Button } from "@/components/ui/button";
import { canResolveHistory } from "@/lib/domain/transaction-history";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { mutate } from "swr";

interface DeletePreview {
  revision: number;
  transaction_status: string;
  entry_kind: string;
  type: string;
  created_at: string;
  memo: string | null;
  transaction_items: unknown[];
}

export default function TransactionListActions({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const requestId = useRef("");
  const [reason, setReason] = useState("");

  const prepareDelete = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/transactions/${transactionId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "이력을 불러오지 못했습니다.");
      if (!canResolveHistory(result.data)) throw new Error("이미 처리된 기록입니다. 최신 거래를 확인해주세요.");
      requestId.current = crypto.randomUUID();
      setReason("");
      setPreview(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "이력을 불러오지 못했습니다.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const deleteHistory = async () => {
    if (!preview || inFlight.current) return;
    if (!reason.trim()) {
      setError("취소 사유를 입력해주세요.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/transactions/${transactionId}/corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: preview.revision, action: "cancel", reason, request_id: requestId.current }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "취소에 실패했습니다.");
      await mutate(
        key =>
          key === "inventories" ||
          key === "products" ||
          key === "stats" ||
          (Array.isArray(key) && key[0] === "transaction-history"),
        undefined,
        { revalidate: true }
      );
      setPreview(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "취소에 실패했습니다.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-gray-100 px-4 py-3">
      <div className="flex justify-end gap-2" aria-label="입출고 이력 작업">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => router.push(`/transactions/${transactionId}?correct=true`)}
        >
          정정
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-red-600"
          disabled={busy || !!preview}
          onClick={() => void prepareDelete()}
        >
          {busy ? "처리 중…" : "취소"}
        </Button>
      </div>
      {preview && (
        <div className="mt-3 space-y-3 rounded-lg border border-red-200 bg-red-50 p-3" aria-label="입출고 취소 확인">
          <p className="text-sm font-medium">이 {preview.type === "in" ? "입고" : "출고"} 이력을 취소할까요?</p>
          <p className="text-sm text-gray-600">
            {new Date(preview.created_at).toLocaleString("ko-KR")} · {preview.transaction_items.length}개 품목
          </p>
          {preview.memo && <p className="whitespace-pre-wrap break-words text-sm">{preview.memo}</p>}
          <p className="text-sm text-gray-600">
            원본을 보존하고 역거래를 추가합니다. 재고가 부족하면 처리되지 않습니다.
          </p>
          <label className="block text-sm">
            취소 사유
            <textarea
              aria-label="취소 사유"
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setError("");
              }}
            >
              닫기
            </Button>
            <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void deleteHistory()}>
              {busy ? "취소 중…" : "취소 확인"}
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
