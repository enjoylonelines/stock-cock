export type ReceiptMode = "IN" | "OUT";

export interface ReceiptFormData {
  location: string;
  supplier: string;
  products: {
    id: string;
    name: string;
    quantity: number;
    memo?: string;
  }[];
  memo?: string;
}

export interface ReceiptContextType {
  mode: ReceiptMode;
  setMode: (mode: ReceiptMode) => void;
  formData: ReceiptFormData;
  setLocation: (location: string) => void;
  setSupplier: (supplier: string) => void;
  addProduct: (product: ReceiptFormData["products"][0]) => void;
  removeProduct: (productId: string) => void;
  updateProduct: (productId: string, data: Partial<ReceiptFormData["products"][0]>) => void;
  setMemo: (memo: string) => void;
  reset: () => void;
  submit: () => Promise<void>;
}
