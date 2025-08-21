"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import Image from "next/image";
import { ArrowDownToLine, ArrowUpDown, ArrowUpToLine } from "lucide-react";
import { GroupedTransactions } from "@/hooks/useInventoryHistory";
import { useRouter } from "next/navigation";

export default function InventoryList({ grouped }: { grouped: GroupedTransactions[] }) {
  const router = useRouter();

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
    <div className="overflow-auto space-y-6 custom-scrollbar">
      {grouped.map((group) => (
        <div key={group.date} className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500">{group.date}</h2>
          <div className="space-y-2">
            {group.transactions.map((transaction) => (
              <div
                key={transaction.transaction_id + transaction.product_name}
                className="flex gap-4 items-center p-4 bg-white rounded-lg shadow-sm"
                onClick={() => router.push(`/inventory/${transaction.transaction_id}`)}
              >
                <div className="flex-shrink-0">{getTypeIcon(transaction.type_kr)}</div>
                <div className="flex-shrink-0">
                  <div className="overflow-hidden relative w-12 h-12 rounded-md bg-slate-100">
                    {transaction.image_url ? (
                      <Image src={transaction.image_url} alt={transaction.product_name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 items-center">
                    <span className="font-medium">{transaction.type_kr}</span>
                    <span className="text-sm text-gray-500">{transaction.product_name}</span>
                  </div>
                  {transaction.to_warehouse_name && <span className="text-sm text-gray-500">{transaction.to_warehouse_name}</span>}{" "}
                  <div className="mt-1 text-sm text-gray-500">총 재고: {transaction.total_stock.toLocaleString()}</div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className={`text-right ${getQuantityColor(transaction.quantity)}`}>
                    {transaction.quantity > 0 ? "+" : ""}
                    {transaction.quantity.toLocaleString()}
                  </div>
                  {/* <Avatar className="w-6 h-6">
                    <AvatarImage className="rounded-[12px]" src={transaction.user.avatar_url} alt={transaction.user.name} />
                    <AvatarFallback>{transaction.user.name[0]}</AvatarFallback>
                  </Avatar> */}
                  <div className="text-sm text-gray-500">{transaction.user_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
