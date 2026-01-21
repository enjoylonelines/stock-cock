import type { ProductOptionView } from "@/types/database";
import { create } from "zustand";

export type TransactionMode = "in" | "out";
const initialWeight = 1200;
// localStorage 키
const STORAGE_KEYS = {
  PRODUCT_FORM: "formState:productForm",
  TRANSACTION_FORM_IN: "formState:transactionForm:in",
  TRANSACTION_FORM_OUT: "formState:transactionForm:out",
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
    // localStorage 저장 실패는 사용자에게 알릴 필요 없음 (에러만 로깅)
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to save to localStorage:", error);
    }
  }
};

export type ProductType = "company" | "franchise" | "pb";

export interface ProductFormState {
  imageFile: File | null;
  imagePath: string;
  localPreviewUrl: string;
  name: string;
  barcode: string;
  categoryId: string;
  brandId: string;
  productType: ProductType;
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
  productType: "company",
  buyPrice: "",
  sellPrice: "",
  initQuantity: "",
  boxUnit: "",
  initLocation: "",
  weight: initialWeight,
  weightUnit: "g" as const,
  sku: "",
});

export interface TransactionFormState {
  selectedLocation: string;
  selectedSupplier: string;
  selectedProducts: ProductOptionView[];
  selectedDate: Date;
  memo: string;
}

const createDefaultTransactionFormState = (): TransactionFormState => ({
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
  transactionForms: Record<TransactionMode, TransactionFormState>;
  moveForm: MoveFormState;
  adjustForm: AdjustFormState;
  updateProductForm: (payload: Partial<ProductFormState>) => void;
  resetProductForm: () => void;
  updateTransactionForm: (mode: TransactionMode, payload: Partial<TransactionFormState>) => void;
  resetTransactionForm: (mode: TransactionMode) => void;
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
    transactionForms: {
      in: loadFromStorage(STORAGE_KEYS.TRANSACTION_FORM_IN, createDefaultTransactionFormState()),
      out: loadFromStorage(STORAGE_KEYS.TRANSACTION_FORM_OUT, createDefaultTransactionFormState()),
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
    updateTransactionForm: (mode, payload) =>
      set(state => {
        const newTransactionForm = { ...state.transactionForms[mode], ...payload };
        const newState = {
          transactionForms: {
            ...state.transactionForms,
            [mode]: newTransactionForm,
          },
        };
        const storageKey = mode === "in" ? STORAGE_KEYS.TRANSACTION_FORM_IN : STORAGE_KEYS.TRANSACTION_FORM_OUT;
        saveToStorage(storageKey, newTransactionForm);
        return newState;
      }),
    resetTransactionForm: mode => {
      const defaultState = createDefaultTransactionFormState();
      const storageKey = mode === "in" ? STORAGE_KEYS.TRANSACTION_FORM_IN : STORAGE_KEYS.TRANSACTION_FORM_OUT;
      localStorage.removeItem(storageKey);
      set(state => ({
        transactionForms: {
          ...state.transactionForms,
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
