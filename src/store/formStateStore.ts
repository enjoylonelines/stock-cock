import type { ProductOptionView } from "@/types/product_option_view";
import { create } from "zustand";

export type ReceiptMode = "in" | "out";
const initialWeight = 1200;
// localStorage 키
const STORAGE_KEYS = {
  PRODUCT_FORM: "formState:productForm",
  RECEIPT_FORM_IN: "formState:receiptForm:in",
  RECEIPT_FORM_OUT: "formState:receiptForm:out",
  MOVE_FORM: "formState:moveForm",
  ADJUST_FORM: "formState:adjustForm",
};

// localStorage에서 상태 복원 (Date 객체 변환 포함)
const loadFromStorage = <T>(key: string, defaultState: T): T => {
  if (typeof window === "undefined") return defaultState;
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultState;
    const parsed = JSON.parse(stored);
    // Date 필드 복원
    if (parsed && typeof parsed === "object") {
      Object.keys(parsed).forEach(k => {
        if (k.includes("Date") && typeof parsed[k] === "string") {
          parsed[k] = new Date(parsed[k]);
        }
      });
    }
    return parsed;
  } catch {
    return defaultState;
  }
};

// localStorage에 상태 저장
const saveToStorage = <T extends Record<string, unknown>>(key: string, state: T): void => {
  if (typeof window === "undefined") return;
  try {
    // File 객체는 저장하지 않음
    const stateToSave: Record<string, unknown> = { ...state };
    if ("imageFile" in stateToSave) {
      stateToSave.imageFile = undefined;
    }
    if ("localPreviewUrl" in stateToSave) {
      stateToSave.localPreviewUrl = undefined;
    }
    localStorage.setItem(key, JSON.stringify(stateToSave));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
};

export interface ProductFormState {
  imageFile: File | null;
  imagePath: string;
  localPreviewUrl: string;
  name: string;
  barcode: string;
  categoryId: string;
  brandId: string;
  buyPrice: string;
  sellPrice: string;
  initQuantity: string;
  boxUnit: string;
  initLocation: string;
  weight: number;
  weightUnit: "g" | "kg";
  sku: string;
  editingProductId?: string;
  editingProductOptionId?: string;
}

const createDefaultProductFormState = (): ProductFormState => ({
  imageFile: null,
  imagePath: "",
  localPreviewUrl: "",
  name: "",
  barcode: "",
  categoryId: "",
  brandId: "",
  buyPrice: "",
  sellPrice: "",
  initQuantity: "",
  boxUnit: "",
  initLocation: "",
  weight: initialWeight,
  weightUnit: "g" as const,
  sku: "",
});

export interface ReceiptFormState {
  selectedLocation: string;
  selectedSupplier: string;
  selectedProducts: ProductOptionView[];
  selectedDate: Date;
  memo: string;
}

const createDefaultReceiptFormState = (): ReceiptFormState => ({
  selectedLocation: "",
  selectedSupplier: "",
  selectedProducts: [],
  selectedDate: new Date(),
  memo: "",
});

export interface MoveFormState {
  fromLocation: string;
  toLocation: string;
  selectedProducts: ProductOptionView[];
  selectedDate: Date;
  memo: string;
}

const createDefaultMoveFormState = (): MoveFormState => ({
  fromLocation: "",
  toLocation: "",
  selectedProducts: [],
  selectedDate: new Date(),
  memo: "",
});

export interface AdjustFormState {
  selectedLocation: string;
  selectedProducts: ProductOptionView[];
  selectedDate: Date;
  memo: string;
}

const createDefaultAdjustFormState = (): AdjustFormState => ({
  selectedLocation: "",
  selectedProducts: [],
  selectedDate: new Date(),
  memo: "",
});

interface FormStateStore {
  productForm: ProductFormState;
  receiptForms: Record<ReceiptMode, ReceiptFormState>;
  moveForm: MoveFormState;
  adjustForm: AdjustFormState;
  updateProductForm: (payload: Partial<ProductFormState>) => void;
  resetProductForm: () => void;
  updateReceiptForm: (mode: ReceiptMode, payload: Partial<ReceiptFormState>) => void;
  resetReceiptForm: (mode: ReceiptMode) => void;
  updateMoveForm: (payload: Partial<MoveFormState>) => void;
  resetMoveForm: () => void;
  updateAdjustForm: (payload: Partial<AdjustFormState>) => void;
  resetAdjustForm: () => void;
}

export const useFormStateStore = create<FormStateStore>(set => {
  // 초기 상태를 localStorage에서 복원
  const loadedProductForm = loadFromStorage(STORAGE_KEYS.PRODUCT_FORM, createDefaultProductFormState());
  // imageFile과 localPreviewUrl은 항상 기본값으로 설정 (저장 불가능한 타입)
  const productForm: ProductFormState = {
    ...loadedProductForm,
    imageFile: null,
    localPreviewUrl: "",
  };

  const initialState: FormStateStore = {
    productForm,
    receiptForms: {
      in: loadFromStorage(STORAGE_KEYS.RECEIPT_FORM_IN, createDefaultReceiptFormState()),
      out: loadFromStorage(STORAGE_KEYS.RECEIPT_FORM_OUT, createDefaultReceiptFormState()),
    },
    moveForm: loadFromStorage(STORAGE_KEYS.MOVE_FORM, createDefaultMoveFormState()),
    adjustForm: loadFromStorage(STORAGE_KEYS.ADJUST_FORM, createDefaultAdjustFormState()),
    updateProductForm: payload =>
      set(state => {
        const newState = { productForm: { ...state.productForm, ...payload } };
        saveToStorage(STORAGE_KEYS.PRODUCT_FORM, newState.productForm);
        return newState;
      }),
    resetProductForm: () => {
      const defaultState = createDefaultProductFormState();
      localStorage.removeItem(STORAGE_KEYS.PRODUCT_FORM);
      set({ productForm: defaultState });
    },
    updateReceiptForm: (mode, payload) =>
      set(state => {
        const newReceiptForm = { ...state.receiptForms[mode], ...payload };
        const newState = {
          receiptForms: {
            ...state.receiptForms,
            [mode]: newReceiptForm,
          },
        };
        const storageKey = mode === "in" ? STORAGE_KEYS.RECEIPT_FORM_IN : STORAGE_KEYS.RECEIPT_FORM_OUT;
        saveToStorage(storageKey, newReceiptForm);
        return newState;
      }),
    resetReceiptForm: mode => {
      const defaultState = createDefaultReceiptFormState();
      const storageKey = mode === "in" ? STORAGE_KEYS.RECEIPT_FORM_IN : STORAGE_KEYS.RECEIPT_FORM_OUT;
      localStorage.removeItem(storageKey);
      set(state => ({
        receiptForms: {
          ...state.receiptForms,
          [mode]: defaultState,
        },
      }));
    },
    updateMoveForm: payload =>
      set(state => {
        const newState = { moveForm: { ...state.moveForm, ...payload } };
        saveToStorage(STORAGE_KEYS.MOVE_FORM, newState.moveForm);
        return newState;
      }),
    resetMoveForm: () => {
      const defaultState = createDefaultMoveFormState();
      localStorage.removeItem(STORAGE_KEYS.MOVE_FORM);
      set({ moveForm: defaultState });
    },
    updateAdjustForm: payload =>
      set(state => {
        const newState = { adjustForm: { ...state.adjustForm, ...payload } };
        saveToStorage(STORAGE_KEYS.ADJUST_FORM, newState.adjustForm);
        return newState;
      }),
    resetAdjustForm: () => {
      const defaultState = createDefaultAdjustFormState();
      localStorage.removeItem(STORAGE_KEYS.ADJUST_FORM);
      set({ adjustForm: defaultState });
    },
  };

  return initialState;
});
