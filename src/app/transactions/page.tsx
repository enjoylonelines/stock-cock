"use client";

import TransactionList from "./_components/TransactionList";
import { useTransactionList } from "./_hooks/useTransactionList";

export default function TransactionsPage() {
  const { filteredGrouped } = useTransactionList();

  return <TransactionList grouped={filteredGrouped} />;
}
