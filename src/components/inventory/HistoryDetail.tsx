"use client";
import { supabase } from "@/lib/supabase";
import type { TransactionHistoryView } from "@/types/database";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface HistoryDetailProps {
  transactionId: string;
}
const getTypeColor = (type: string) => {
  switch (type) {
    case "in":
      return "text-blue-500";
    case "out":
      return "text-red-500";
    case "adjust":
      return "text-green-500";
    case "move":
      return "text-yellow-500";
  }
};

export default function HistoryDetail({ transactionId }: HistoryDetailProps) {
  const [data, setData] = useState<TransactionHistoryView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("transaction_history_view").select("*").eq("transaction_id", transactionId);
      setLoading(false);
      setData(data);
      console.log(data);
    };
    fetchData();
  }, [transactionId]);

  if (loading) return <div className="p-8 text-center">로딩중...</div>;
  if (!data) return <div className="p-8 text-center">데이터 없음</div>;

  // 타입 색상 및 텍스트
  const typeMap = {
    in: { label: "입고", color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-400" },
    out: { label: "출고", color: "text-red-500", bg: "bg-red-50", border: "border-red-400" },
    move: {
      label: "이동",
      color: "text-yellow-500",
      bg: "bg-yellow-50",
      border: "border-yellow-400",
    },
    adjust: {
      label: "조정",
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-400",
    },
  };
  const typeInfo = typeMap[data[0].type];

  return (
    <div className="p-4 mx-auto w-full max-w-3xl bg-white">
      {/* 헤더: 뒤로가기 + 제목 + 타입 뱃지 */}
      <div className="flex justify-start items-center mb-4">
        <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${typeInfo.color} ${typeInfo.bg} ${typeInfo.border}`}>
          {typeInfo.label}
        </span>
      </div>
      {/* 상단: 타입, 담당자 */}
      <div className="flex justify-between items-center mb-2">
        {/* <div className={`px-3 py-1 rounded-full font-bold text-base ${typeInfo.color} ${typeInfo.bg}`}>{typeInfo.label}</div> */}
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">{data[0].user_name}</span>
          {data[0].user_image_url && (
            <Image src={data[0].user_image_url} alt={data[0].user_name || "알 수 없음"} width={32} height={32} className="rounded-full" />
          )}
        </div>
      </div>
      <hr className="my-2" />
      {/* 위치, 거래처(입고 시), 일시 */}
      <div className="mb-2 text-sm text-gray-600">
        <div className="flex justify-between mb-1">
          <span className="font-medium text-gray-500">위치</span>
          <span>{data[0].to_warehouse_name || data[0].from_warehouse_name}</span>
        </div>
        {(data[0].type === "in" || data[0].type === "out") && data[0].supplier_name && (
          <div className="flex justify-between mb-1">
            <span className="font-medium text-gray-500">거래처</span>
            <span>{data[0].supplier_name}</span>
          </div>
        )}
        <div className="flex justify-between mb-1">
          <span className="font-medium text-gray-500">{typeInfo.label}일</span>
          <span>
            {new Date(data[0].created_at).toLocaleString("ko-KR", {
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
        <div className="mb-2 text-sm font-medium text-gray-700">{data.length}품목</div>
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.transaction_id + item.product_name} className="flex gap-3 items-center">
              <div className="overflow-hidden relative w-12 h-12 bg-gray-100 rounded-lg">
                {item.product_image_url ? (
                  <Image src={item.product_image_url} alt={item.product_name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{item.product_name}</div>
                <div className="text-xs text-gray-500">
                  {item.unit_price?.toLocaleString()} {item.weight}g
                </div>
              </div>
              {/* <div className="flex flex-col items-end">
                <span className="text-base font-semibold text-green-600">→ {item.quantity?.toLocaleString()}</span>
              </div> */}
              <div className={`text-right ${getTypeColor(item.type)}`}>
                {item.type === "in" ? "+" : item.type === "out" ? "-" : ""}
                {item.quantity.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
      <hr className="my-2" />
      {/* 메모 */}
      <div className="text-sm text-gray-600">
        <div className="mb-1 font-medium text-gray-500">메모</div>
        <div>{data[0].memo || <span className="text-gray-400">-</span>}</div>
      </div>
    </div>
  );
}
