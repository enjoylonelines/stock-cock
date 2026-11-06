"use client";

import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";
import { useWarehouses } from "@/hooks/useWarehouses";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mutate } from "swr";

interface Header {
  type: string;
  revision: number;
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
  const router = useRouter();
  const { products } = useProducts();
  const { warehouses } = useWarehouses();
  const [header, setHeader] = useState<Header | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
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
        if (active) setHeader(result.data);
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
  }, [transactionId]);

  const beginEdit = () => {
    if (!header) return;
    setMemo(header.memo || "");
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

  const submit = async (deleting: boolean) => {
    if (!header || busy) return;
    if (deleting && !window.confirm("이 입출고를 삭제할까요? 재고 변동이 되돌려지며 취소 기록은 보존됩니다.")) return;
    if (
      !deleting &&
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
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: deleting ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: header.revision,
          memo,
          created_at: deleting ? undefined : date === localDate(header.created_at) ? header.created_at : `${date}:00`,
          warehouse_id: warehouse,
          supplier_id: supplier || null,
          items: items.map(item => ({ option_id: item.option_id, quantity: Number(item.quantity) })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "변경에 실패했습니다.");
      await mutate(() => true, undefined, { revalidate: true });
      if (deleting) {
        router.push("/transactions");
        router.refresh();
      } else {
        // Reload both the detail and its revision after saving.
        window.location.reload();
      }
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
  if (header.type !== "in" && header.type !== "out") return null;

  return (
    <section className="mb-4 space-y-3" aria-label="입출고 관리">
      <div className="flex gap-2">
        <Button variant="outline" disabled={busy} onClick={editing ? () => setEditing(false) : beginEdit}>
          {editing ? "수정 취소" : "수정"}
        </Button>
        <Button variant="outline" className="text-red-600" disabled={busy} onClick={() => submit(true)}>
          {busy ? "처리 중…" : "삭제"}
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
            void submit(false);
          }}
        >
          <fieldset disabled={busy} className="space-y-4">
            <legend className="mb-3 font-medium">입출고 수정</legend>
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
            <p className="text-xs text-gray-500">
              저장하면 변경된 수량을 재고에 함께 반영합니다. 재고가 부족하면 저장되지 않습니다.
            </p>
            <Button type="submit" disabled={busy}>
              {busy ? "저장 중…" : "변경사항 저장"}
            </Button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
