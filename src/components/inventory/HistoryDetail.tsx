"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Receipt, ReceiptItemWithProduct } from "@/types/receipt";

type User = { id: string; name: string; avatar_url?: string };
type Location = { id: string; name: string };
type Supplier = { id: string; name: string };

export type ReceiptWithRelations = Receipt & {
  user?: User | null;
  location?: Location | null;
  supplier?: Supplier | null;
  receipt_items: ReceiptItemWithProduct[];
};

interface HistoryDetailProps {
  receiptId: string;
}

export default function HistoryDetail({ receiptId }: HistoryDetailProps) {
  const [data, setData] = useState<ReceiptWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("receipts")
        .select(
          `
          *,
          user:users (id, name, avatar_url),
          location:locations (id, name),
          supplier:suppliers (id, name),
          receipt_items (
            *,
            product:products (id, name, image_url, sell_price, buy_price, category, brand)
          )
        `
        )
        .eq("id", receiptId)
        .maybeSingle();
      setData(data as ReceiptWithRelations);
      setLoading(false);
    };
    fetchData();
  }, [receiptId]);

  if (loading) return <div className="p-8 text-center">로딩중...</div>;
  if (!data) return <div className="p-8 text-center">데이터 없음</div>;

  // 타입 색상 및 텍스트
  const typeMap = {
    IN: { label: "입고", color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-400" },
    OUT: { label: "출고", color: "text-red-500", bg: "bg-red-50", border: "border-red-400" },
    ADJUST: { label: "조정", color: "text-green-600", bg: "bg-green-50", border: "border-green-400" },
  };
  const typeInfo = typeMap[data.type as keyof typeof typeMap] || typeMap.ADJUST;

  return (
    <div className="max-w-md p-4 mx-auto bg-white shadow rounded-xl">
      {/* 헤더: 뒤로가기 + 제목 + 타입 뱃지 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-500 hover:text-gray-900">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-center">상세 내역</h1>
        <span className={`ml-2 px-3 py-1 rounded-full border text-sm font-semibold ${typeInfo.color} ${typeInfo.bg} ${typeInfo.border}`}>
          {typeInfo.label}
        </span>
      </div>
      {/* 상단: 타입, 담당자 */}
      <div className="flex items-center justify-between mb-2">
        <div className={`px-3 py-1 rounded-full font-bold text-base ${typeInfo.color} ${typeInfo.bg}`}>{typeInfo.label}</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{data.user?.name}</span>
          {data.user?.avatar_url && (
            <Image src={data.user.avatar_url} alt={data.user.name} width={32} height={32} className="rounded-full" />
          )}
        </div>
      </div>
      <hr className="my-2" />
      {/* 위치, 일시 */}
      <div className="mb-2 text-sm text-gray-600">
        <div className="flex justify-between mb-1">
          <span className="font-medium text-gray-500">위치</span>
          <span>{data.location?.name}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="font-medium text-gray-500">{typeInfo.label}일</span>
          <span>
            {new Date(data.created_at).toLocaleString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
      <hr className="my-2" />
      {/* 품목 리스트 */}
      <div className="mb-2">
        <div className="mb-2 text-sm font-medium text-gray-700">{data.receipt_items.length}품목</div>
        <div className="space-y-3">
          {data.receipt_items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="relative w-12 h-12 overflow-hidden bg-gray-100 rounded-lg">
                {item.product?.image_url ? (
                  <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{item.product?.name}</div>
                <div className="text-xs text-gray-500">
                  {item.product?.sell_price?.toLocaleString()} | {item.product?.buy_price?.toLocaleString()} | {item.product?.category} |{" "}
                  {item.product?.brand}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-base font-semibold text-green-600">→ {item.quantity?.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <hr className="my-2" />
      {/* 메모 */}
      <div className="text-sm text-gray-600">
        <div className="mb-1 font-medium text-gray-500">메모</div>
        <div>{data.memo || <span className="text-gray-400">-</span>}</div>
      </div>
    </div>
  );
}
