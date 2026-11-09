"use client";

import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";
import { useWarehouses } from "@/hooks/useWarehouses";
import { canResolveHistory, historyStatusLabel } from "@/lib/domain/transaction-history";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mutate } from "swr";

interface Header {
  type: string;
  revision: number;
  transaction_status: string;
  entry_kind: string;
  source_transaction_id: string | null;
  resolved_by_transaction_id: string | null;
  latest_memo: string | null;
  memo_notes: { id: number; memo: string; reason: string; created_at: string }[];
  memo: string | null;
  created_at: string;
  supplier_id: string | null;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  transaction_items: { product_option_id: string; quantity: number }[];
}
interface Item {
  option_id: string;
  quantity: string;
}
const fieldClass = "w-full rounded-md border border-gray-300 bg-white p-2 text-sm";
function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function TransactionActions({ transactionId }: { transactionId: string }) {
  const openEditor = useSearchParams().get("correct") === "true";
  const { products } = useProducts();
  const { warehouses } = useWarehouses();
  const [header, setHeader] = useState<Header | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [memoOnly, setMemoOnly] = useState(false);
  const requestId = useRef("");
  const [error, setError] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [supplier, setSupplier] = useState("");
  const [suppliers, setSuppliers] = useState<{ id: string; name: string | null }[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/transactions/${transactionId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) {
          const loaded: Header = result.data;
          setHeader(loaded);
          if (openEditor) {
            setMemo(loaded.latest_memo ?? loaded.memo ?? "");
            requestId.current = crypto.randomUUID();
            setDate(localDate(loaded.created_at));
            setWarehouse(loaded.to_warehouse_id || loaded.from_warehouse_id || "");
            setSupplier(loaded.supplier_id || "");
            setItems(
              loaded.transaction_items.map(item => ({
                option_id: item.product_option_id,
                quantity: String(item.quantity),
              }))
            );
            setEditing(true);
          }
        }
        const { data } = await createClient().from("suppliers").select("id, name").order("name");
        if (active) setSuppliers(data || []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "이력을 불러오지 못했습니다.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [transactionId, openEditor]);

  const beginEdit = (onlyMemo = false) => {
    setMemoOnly(onlyMemo);
    setReason("");
    requestId.current = crypto.randomUUID();
    if (!header) return;
    setMemo(header.latest_memo ?? header.memo ?? "");
    setDate(localDate(header.created_at));
    setWarehouse(header.to_warehouse_id || header.from_warehouse_id || "");
    setSupplier(header.supplier_id || "");
    setItems(
      header.transaction_items.map(item => ({
        option_id: item.product_option_id,
        quantity: String(item.quantity),
      }))
    );
    setError("");
    setEditing(true);
  };

  const submit = async () => {
    if (!header || busy) return;
    if (!reason.trim()) {
      setError("사유를 입력해주세요.");
      return;
    }
    if (
      !memoOnly &&
      (!warehouse ||
        !date ||
        !items.length ||
        items.some(
          item => !item.option_id || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) <= 0
        ))
    ) {
      setError("창고, 거래일, 품목과 양의 정수 수량을 입력해주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/transactions/${transactionId}/corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: header.revision,
          action: memoOnly ? "memo" : "correct",
          reason,
          request_id: requestId.current,
          memo,
          created_at: date === localDate(header.created_at) ? header.created_at : `${date}:00`,
          warehouse_id: warehouse,
          supplier_id: supplier || null,
          items: items.map(item => ({ option_id: item.option_id, quantity: Number(item.quantity) })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "변경에 실패했습니다.");
      await mutate(() => true, undefined, { revalidate: true });
      window.location.assign(`/transactions/${result.transaction_id || transactionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!header)
    return error ? (
      <p role="alert" className="mb-4 text-sm text-red-600">
        {error}
      </p>
    ) : null;
  const canResolve = canResolveHistory(header);
  const recordLinks = (
    <div className="space-y-2 text-sm">
      <p className="font-medium">{historyStatusLabel(header)} · 확정 원본 보존</p>
      {header.source_transaction_id && (
        <Link className="block text-blue-600 underline" href={`/transactions/${header.source_transaction_id}`}>
          원본 보기
        </Link>
      )}
      {header.resolved_by_transaction_id && (
        <Link className="block text-blue-600 underline" href={`/transactions/${header.resolved_by_transaction_id}`}>
          정정·취소 기록 보기
        </Link>
      )}
      {header.memo_notes.map(note => (
        <div key={note.id} className="rounded border p-2">
          <p className="font-medium">메모 정정 · {new Date(note.created_at).toLocaleString("ko-KR")}</p>
          <p className="whitespace-pre-wrap">{note.memo || "메모 없음"}</p>
          <p>사유: {note.reason}</p>
        </div>
      ))}
    </div>
  );
  if (!canResolve) return <section className="mb-4">{recordLinks}</section>;

  return (
    <section className="mb-4 space-y-3" aria-label="입출고 관리">
      {recordLinks}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={editing ? () => setEditing(false) : () => beginEdit(false)}>
          {editing ? "닫기" : "정정"}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => beginEdit(true)}>
          메모 정정
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {editing && (
        <form
          className="space-y-4 rounded-lg border bg-gray-50 p-4"
          onSubmit={event => {
            event.preventDefault();
            void submit();
          }}
        >
          <fieldset disabled={busy} className="space-y-4">
            <legend className="mb-3 font-medium">입출고 정정</legend>
            {!memoOnly && (
              <>
                <label className="block space-y-1 text-sm">
                  거래일
                  <input
                    aria-label="거래일"
                    type="datetime-local"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  창고
                  <select
                    aria-label="창고"
                    required
                    value={warehouse}
                    onChange={e => setWarehouse(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">창고 선택</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 text-sm">
                  거래처
                  <select
                    aria-label="거래처"
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">없음</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="space-y-3">
                  <p className="text-sm font-medium">품목 · 수량 (완제품: 개, 원재료: g)</p>
                  {items.map((item, index) => (
                    <div key={index} className="space-y-2 rounded-md border bg-white p-2">
                      <select
                        aria-label={`품목 ${index + 1}`}
                        required
                        value={item.option_id}
                        onChange={e =>
                          setItems(old => old.map((v, i) => (i === index ? { ...v, option_id: e.target.value } : v)))
                        }
                        className={fieldClass}
                      >
                        <option value="">제품 선택</option>
                        {!products.some(p => p.productOptionId === item.option_id) && item.option_id && (
                          <option value={item.option_id}>기존 제품 (삭제됨)</option>
                        )}
                        {products.map(p => (
                          <option key={p.productOptionId} value={p.productOptionId}>
                            {p.name} · {p.weight}
                            {p.unitLabel} · {p.stockUnit === "GRAM" ? "g" : "개"}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input
                          aria-label={`수량 ${index + 1}`}
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={item.quantity}
                          onChange={e =>
                            setItems(old => old.map((v, i) => (i === index ? { ...v, quantity: e.target.value } : v)))
                          }
                          className={fieldClass}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={items.length === 1}
                          onClick={() => setItems(old => old.filter((_, i) => i !== index))}
                        >
                          제거
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setItems(old => [...old, { option_id: "", quantity: "1" }])}
                  >
                    품목 추가
                  </Button>
                </div>
              </>
            )}
            <label className="block space-y-1 text-sm">
              메모
              <textarea
                aria-label="메모"
                rows={4}
                value={memo}
                onChange={e => setMemo(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm">
              정정 사유
              <textarea
                aria-label="정정 사유"
                required
                rows={2}
                value={reason}
                onChange={e => setReason(e.target.value)}
                className={fieldClass}
              />
            </label>
            <p className="text-xs text-gray-500">
              원본은 바뀌지 않습니다. 정정은 역거래와 새 거래를 추가하고, 메모 정정은 재고에 영향을 주지 않습니다.
            </p>
            <Button type="submit" disabled={busy}>
              {busy ? "저장 중…" : "정정 기록 추가"}
            </Button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
