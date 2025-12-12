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
type ReceiptStep = "main" | "location" | "supplier" | "products" | "memo" | null;

interface DrawerState {
  isOpen: boolean;
  currentForm: FormType;
  receiptStep: ReceiptStep;
  openDrawer: (formType: FormType) => void;
  closeDrawer: () => void;
  setCurrentForm: (formType: FormType) => void;
  setReceiptStep: (step: ReceiptStep) => void;
}

export const useDrawerStore = create<DrawerState>(set => ({
  isOpen: false,
  currentForm: null,
  receiptStep: null,
  openDrawer: (formType: FormType) =>
    set({
      isOpen: true,
      currentForm: formType,
      receiptStep: formType === "receipt" ? "main" : null,
    }),
  closeDrawer: () => set({ isOpen: false, currentForm: null, receiptStep: null }),
  setCurrentForm: (formType: FormType) => set({ currentForm: formType }),
  setReceiptStep: (step: ReceiptStep) => set({ receiptStep: step }),
}));
