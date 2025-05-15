import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import Image from "next/image";
import { ArrowDownToLine, ArrowUpDown, ArrowUpToLine } from "lucide-react";
import { useInventoryHistory } from "@/hooks/useInventoryHistory";
import { useRouter } from "next/navigation";

export default function InventoryList() {
  const router = useRouter();
  const { grouped } = useInventoryHistory();
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
    <div className="space-y-6 overflow-auto custom-scrollbar">
      {grouped.map((group) => (
        <div key={group.date} className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500">{group.date}</h2>
          <div className="space-y-2">
            {group.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm"
                onClick={() => router.push(`/inventory/${transaction.receipt_id}`)}
              >
                <div className="flex-shrink-0">{getTypeIcon(transaction.type)}</div>
                <div className="flex-shrink-0">
                  <div className="relative w-12 h-12 overflow-hidden rounded-md bg-slate-100">
                    {transaction.image_url ? (
                      <Image src={transaction.image_url} alt={transaction.product_name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{transaction.type}</span>
                    <span className="text-sm text-gray-500">{transaction.product_name}</span>
                  </div>
                  {transaction.location && <div className="text-sm text-gray-500">{transaction.location}</div>}
                  {transaction.note && <div className="text-sm text-gray-500">{transaction.note}</div>}
                  <div className="mt-1 text-sm text-gray-500">총 재고: {transaction.total_stock.toLocaleString()}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`text-right ${getQuantityColor(transaction.quantity)}`}>
                    {transaction.quantity > 0 ? "+" : ""}
                    {transaction.quantity.toLocaleString()}
                  </div>
                  <Avatar className="w-6 h-6">
                    <AvatarImage className="rounded-[12px]" src={transaction.user.avatar_url} alt={transaction.user.name} />
                    <AvatarFallback>{transaction.user.name[0]}</AvatarFallback>
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
