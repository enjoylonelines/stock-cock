"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useProducts } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, Clock3, FileText, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";

type DocumentStatus = "DRAFT" | "PENDING_APPROVAL" | "REFLECTED" | "REJECTED" | "CANCELLED";

type InventoryDocument = {
  id: string;
  document_type: "in" | "out";
  status: DocumentStatus;
  requester_id: string;
  warehouse_id: string;
  supplier_id: string | null;
  memo: string;
  sales_amount: number | null;
  effective_at: string;
  requested_at: string | null;
  reflected_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  transaction_id: string | null;
  created_at: string;
  lines: Array<{ id: string; product_option_id: string; quantity: number }>;
};

type DocumentListResponse = {
  can_approve: boolean;
  documents: InventoryDocument[];
};

const statusMeta: Record<DocumentStatus, { label: string; className: string }> = {
  DRAFT: { label: "작성 중", className: "bg-slate-100 text-slate-700" },
  PENDING_APPROVAL: { label: "승인 대기", className: "bg-amber-100 text-amber-800" },
  REFLECTED: { label: "반영 완료", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "반려됨", className: "bg-rose-100 text-rose-800" },
  CANCELLED: { label: "취소됨", className: "bg-slate-100 text-slate-600" },
};

const fetcher = async (): Promise<DocumentListResponse> => {
  const response = await fetch("/api/inventory-documents");
  if (!response.ok) throw new Error("승인 전표를 불러오지 못했습니다.");
  return response.json();
};

const actionLabel = (type: "in" | "out") => (type === "in" ? "입고" : "출고");

export default function InventoryDocumentsPage() {
  const user = useUser();
  const { products } = useProducts();
  const { data, error, isLoading } = useSWR<DocumentListResponse>("inventory-documents", fetcher, {
    revalidateOnFocus: true,
  });
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const productNames = useMemo(
    () => new Map(products.map(product => [product.productOptionId, product.name])),
    [products]
  );

  const runAction = useCallback(async (document: InventoryDocument, action: "approve" | "reject" | "cancel") => {
    if (action === "approve" && !window.confirm("승인 후 재고에 반영합니다. 계속할까요?")) return;
    if (action === "cancel" && !window.confirm("이 승인 요청을 취소할까요?")) return;

    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("반려 사유를 입력해 주세요.")?.trim();
      if (!reason) return;
    }

    try {
      setPendingActionId(document.id);
      const response = await fetch(`/api/inventory-documents/${document.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "전표 처리 중 오류가 발생했습니다.");
      }
      await mutate("inventory-documents");
      if (action === "approve") {
        await Promise.all([
          mutate("inventories"),
          mutate(key => Array.isArray(key) && key[0] === "transaction-history"),
        ]);
      }
    } catch (actionError) {
      alert(actionError instanceof Error ? actionError.message : "전표 처리 중 오류가 발생했습니다.");
    } finally {
      setPendingActionId(null);
    }
  }, []);

  if (isLoading) {
    return <div className="p-4 text-sm text-slate-500">승인 전표를 불러오는 중입니다.</div>;
  }
  if (error) {
    return (
      <div className="p-4">
        <div className="flex gap-2 items-center p-3 text-sm text-rose-700 bg-rose-50 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          승인 전표를 불러오지 못했습니다.
        </div>
      </div>
    );
  }

  const documents = data?.documents ?? [];

  return (
    <div className="container p-4 mx-auto space-y-4 max-w-3xl">
      <section className="p-4 bg-slate-50 rounded-xl border">
        <div className="flex gap-3 items-start">
          <Clock3 className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h2 className="font-semibold">승인 전표</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              요청은 승인 전까지 재고에 반영되지 않습니다. 승인자는 한 번의 처리로 재고 반영까지 완료합니다.
            </p>
          </div>
        </div>
      </section>

      {documents.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-xl border">
          <FileText className="mx-auto w-8 h-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">표시할 승인 전표가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(document => {
            const status = statusMeta[document.status];
            const isOwn = document.requester_id === user?.id;
            const canApprove = Boolean(data?.can_approve) && !isOwn && document.status === "PENDING_APPROVAL";
            const canCancel = isOwn && ["DRAFT", "PENDING_APPROVAL"].includes(document.status);
            const isPending = pendingActionId === document.id;

            return (
              <article key={document.id} className="p-4 bg-white rounded-xl border shadow-sm">
                <div className="flex gap-3 justify-between items-start">
                  <div className="min-w-0">
                    <p className="font-semibold">{actionLabel(document.document_type)} 전표</p>
                    <p className="mt-1 text-xs text-slate-500">
                      기준일 {new Date(document.effective_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <span className={cn("shrink-0 px-2 py-1 text-xs font-medium rounded-full", status.className)}>
                    {status.label}
                  </span>
                </div>

                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  {document.lines.map(line => (
                    <li key={line.id} className="flex gap-3 justify-between">
                      <span className="min-w-0 truncate">
                        {productNames.get(line.product_option_id) ?? "알 수 없는 제품"}
                      </span>
                      <span className="shrink-0 font-medium">
                        {line.quantity.toLocaleString()}{" "}
                        {products.find(product => product.productOptionId === line.product_option_id)?.stockUnit ===
                        "GRAM"
                          ? "g"
                          : "개"}
                      </span>
                    </li>
                  ))}
                </ul>

                {document.memo && <p className="pt-3 mt-3 text-sm text-slate-600 border-t">{document.memo}</p>}
                {document.sales_amount !== null && (
                  <p className="pt-3 mt-3 text-sm text-slate-700 border-t">
                    판매 금액: {document.sales_amount.toLocaleString()}원 · 전액 미수
                  </p>
                )}
                {document.rejection_reason && (
                  <p className="pt-3 mt-3 text-sm text-rose-700 border-t">반려 사유: {document.rejection_reason}</p>
                )}

                {(canApprove || canCancel) && (
                  <div className="flex gap-2 pt-3 mt-3 border-t">
                    {canApprove && (
                      <>
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          disabled={isPending}
                          onClick={() => runAction(document, "approve")}
                        >
                          <Check className="w-4 h-4" />
                          승인하고 재고 반영
                        </Button>
                        <Button variant="outline" disabled={isPending} onClick={() => runAction(document, "reject")}>
                          <X className="w-4 h-4" />
                          반려
                        </Button>
                      </>
                    )}
                    {canCancel && (
                      <Button
                        variant="outline"
                        className="w-full text-slate-600"
                        disabled={isPending}
                        onClick={() => runAction(document, "cancel")}
                      >
                        승인 요청 취소
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
