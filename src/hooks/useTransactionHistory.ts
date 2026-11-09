"use client";

import { createClient } from "@/lib/supabase/client";
import type { TransactionHistoryView } from "@/types/database";
import { useEffect, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { useInventories } from "./useInventories";

export interface TransactionHistoryItem extends TransactionHistoryView {
  date: string;
  product_id: string;
  product_name: string;
  total_stock: number;
  type_kr: "입고" | "출고" | "이동" | "조정";
  image_url: string;
  broadcast_id: number;
}
export interface GroupedTransactions {
  date: string;
  transactions: TransactionHistoryItem[];
}
const supabase = createClient();
const key = ["transaction-history"] as const;
const labels = { in: "입고", out: "출고", move: "이동", adjust: "조정" } as const;
const fetcher = async (): Promise<TransactionHistoryView[]> => {
  const { data, error } = await supabase
    .from("transaction_history_view")
    .select("*")
    .order("recorded_at", { ascending: false })
    .order("transaction_id");
  if (error) throw error;
  return data || [];
};

export function useTransactionHistory() {
  const { inventories } = useInventories();
  const { data, isLoading, error } = useSWR<TransactionHistoryView[]>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });
  // Derive current stock from current inventory data, not from an async fetcher's stale closure.
  // Historical balances cannot be reconstructed from legacy pruned/edited records.
  const processed = useMemo(() => {
    const stock: Record<string, number> = {};
    for (const inventory of inventories) {
      if (inventory.product_option_id) {
        stock[inventory.product_option_id] =
          (stock[inventory.product_option_id] || 0) + (inventory.quantity ?? inventory.weight_in_grams ?? 0);
      }
    }
    const transactions: TransactionHistoryItem[] = (data || [])
      .filter((tx): tx is TransactionHistoryView & { product_option_id: string; created_at: string } =>
        Boolean(tx.product_option_id && tx.created_at)
      )
      .map((tx, index) => {
        const date = new Date(tx.created_at);
        return {
          ...tx,
          product_id: tx.product_option_id,
          product_name: tx.product_name || "",
          date: `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`,
          type_kr: labels[tx.type as keyof typeof labels] || "입고",
          quantity: (tx.quantity || 0) * (tx.type === "out" ? -1 : 1),
          total_stock: stock[tx.product_option_id] || 0,
          broadcast_id: (data || []).length - index,
          image_url: tx.user_image_url || "",
        };
      });
    const groups = new Map<string, TransactionHistoryItem[]>();
    for (const transaction of transactions) {
      const group = groups.get(transaction.date) || [];
      group.push(transaction);
      groups.set(transaction.date, group);
    }
    return { transactions, grouped: [...groups].map(([date, transactions]) => ({ date, transactions })) };
  }, [data, inventories]);

  useEffect(() => {
    const refresh = () => {
      void mutate("inventories");
      void mutate("products");
      void mutate("stats");
      void mutate(key);
    };
    const channel = supabase
      .channel("transaction_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transaction_resolutions" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transaction_memo_notes" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  return { ...processed, loading: isLoading, error };
}
