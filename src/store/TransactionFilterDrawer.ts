import { createFilterStore } from "./createFilterStore";

export type TransactionType = "전체" | "입고" | "출고" | "조정" | "이동";

export interface FilterState {
  transactionType: TransactionType;
  startDate: Date | null;
  endDate: Date | null;
  location: string;
  product: string;
  supplier: string;
  member: string;
  [key: string]: unknown;
}

export const defaultFilterState: FilterState = {
  transactionType: "전체",
  startDate: null,
  endDate: null,
  location: "",
  product: "",
  supplier: "",
  member: "",
};

export const useTransactionFilterDrawerStore = createFilterStore<FilterState>("transactionFilter", defaultFilterState);
