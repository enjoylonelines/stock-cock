import { create } from "zustand";

export type FormType =
  | "receipt"
  | "issue"
  | "move"
  | "adjust"
  | "shortage"
  | "inventory"
  | "history"
  | "member"
  | "product"
  | "product-edit"
  | "excel"
  | null;
type TransactionStep = "main" | "location" | "supplier" | "products" | "memo" | null;

interface DrawerState {
  isOpen: boolean;
  currentForm: FormType;
  transactionStep: TransactionStep;
  openDrawer: (formType: FormType) => void;
  closeDrawer: () => void;
  setCurrentForm: (formType: FormType) => void;
  setTransactionStep: (step: TransactionStep) => void;
}

export const useDrawerStore = create<DrawerState>(set => ({
  isOpen: false,
  currentForm: null,
  transactionStep: null,
  openDrawer: (formType: FormType) =>
    set({
      isOpen: true,
      currentForm: formType,
      transactionStep: formType === "receipt" ? "main" : null,
    }),
  closeDrawer: () => set({ isOpen: false, currentForm: null, transactionStep: null }),
  setCurrentForm: (formType: FormType) => set({ currentForm: formType }),
  setTransactionStep: (step: TransactionStep) => set({ transactionStep: step }),
}));
