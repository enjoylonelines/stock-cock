"use client";

import { ArrowDownToLine, ArrowUpToLine, ArrowUpDown } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface InventoryTransaction {
  id: string;
  type: "입고" | "출고" | "조정";
  productName: string;
  quantity: number;
  location?: string;
  note?: string;
  imageUrl?: string;
  totalStock: number;
  updatedBy: {
    name: string;
    avatarUrl?: string;
  };
}

interface GroupedTransactions {
  date: string;
  transactions: InventoryTransaction[];
}

export default function InventoryList() {
  // 임시 데이터
  const transactions: GroupedTransactions[] = [
    {
      date: "2025년 4월 14일",
      transactions: [
        {
          id: "1",
          type: "출고",
          productName: "2품목",
          quantity: -2098,
          note: "2025년 4월 14일 재고조사",
          imageUrl: "/images/product-1.jpg",
          totalStock: 5902,
          updatedBy: {
            name: "김관리",
            avatarUrl: "/images/avatar-1.png",
          },
        },
        {
          id: "2",
          type: "조정",
          productName: "고기왕만두",
          quantity: -599,
          note: "2025년 4월 14일 재고조사",
          imageUrl: "/images/product-1.jpg",
          totalStock: 401,
          updatedBy: {
            name: "김관리",
            avatarUrl: "/images/avatar-1.png",
          },
        },
        {
          id: "3",
          type: "입고",
          productName: "2품목",
          quantity: 1000,
          location: "생산실",
          imageUrl: "/images/product-1.jpg",
          totalStock: 8000,
          updatedBy: {
            name: "이생산",
            avatarUrl: "/images/avatar-2.png",
          },
        },
      ],
    },
    {
      date: "2025년 3월 25일",
      transactions: [
        {
          id: "4",
          type: "조정",
          productName: "1품목",
          quantity: 1000,
          note: "초기 수량",
          imageUrl: "/images/product-2.jpg",
          totalStock: 1000,
          updatedBy: {
            name: "박초기",
            avatarUrl: "/images/avatar-3.png",
          },
        },
      ],
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "입고":
        return <ArrowDownToLine className="w-4 h-4 text-blue-500" />;
      case "출고":
        return <ArrowUpToLine className="w-4 h-4 text-red-500" />;
      default:
        return <ArrowUpDown className="w-4 h-4 text-green-500" />;
    }
  };

  const getQuantityColor = (quantity: number) => {
    if (quantity > 0) return "text-blue-500";
    if (quantity < 0) return "text-red-500";
    return "text-gray-900";
  };

  return (
    <div className="space-y-6">
      {transactions.map((group) => (
        <div key={group.date} className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500">{group.date}</h2>
          <div className="space-y-2">
            {group.transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="flex-shrink-0">{getTypeIcon(transaction.type)}</div>
                <div className="flex-shrink-0">
                  <div className="relative w-12 h-12 overflow-hidden rounded-md bg-slate-100">
                    {transaction.imageUrl ? (
                      <Image src={transaction.imageUrl} alt={transaction.productName} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{transaction.type}</span>
                    <span className="text-sm text-gray-500">{transaction.productName}</span>
                  </div>
                  {transaction.location && <div className="text-sm text-gray-500">{transaction.location}</div>}
                  {transaction.note && <div className="text-sm text-gray-500">{transaction.note}</div>}
                  <div className="mt-1 text-sm text-gray-500">총 재고: {transaction.totalStock.toLocaleString()}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`text-right ${getQuantityColor(transaction.quantity)}`}>
                    {transaction.quantity > 0 ? "+" : ""}
                    {transaction.quantity.toLocaleString()}
                  </div>
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={transaction.updatedBy.avatarUrl} alt={transaction.updatedBy.name} />
                    <AvatarFallback>{transaction.updatedBy.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
