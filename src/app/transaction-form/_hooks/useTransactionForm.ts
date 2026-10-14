import { useUser } from "@/contexts/UserContext";
import { useFormStateStore } from "@/store/formStateStore";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { transactionValidator } from "../_lib/transaction-validator";
import { inventoryDocumentService } from "../_services/inventory-document-service";

/**
 * 입출고 거래 폼 비즈니스 로직 훅
 */
export function useTransactionForm(mode: "in" | "out", closeDrawer: () => void) {
  const [isLoading, setIsLoading] = useState(false);
  const submissionKeyRef = useRef<string | null>(null);
  const router = useRouter();
  const user = useUser();
  const transactionFormState = useFormStateStore(state => state.transactionForms[mode]);
  const updateTransactionForm = useFormStateStore(state => state.updateTransactionForm);
  const resetTransactionForm = useFormStateStore(state => state.resetTransactionForm);
  const { selectedLocation, selectedSupplier, selectedProducts, selectedDate, memo, salesAmount } =
    transactionFormState;

  // 폼 검증
  const validation = useMemo(
    () =>
      transactionValidator.validateTransactionForm({
        selectedLocation,
        selectedSupplier,
        selectedProducts,
        mode,
        salesAmount,
      }),
    [selectedLocation, selectedSupplier, selectedProducts, mode, salesAmount]
  );

  const isFormValid = validation.isValid;

  // 제출 핸들러
  const handleSubmit = useCallback(async () => {
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    if (!user?.id) {
      alert("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      setIsLoading(true);

      const requestKey = submissionKeyRef.current ?? crypto.randomUUID();
      submissionKeyRef.current = requestKey;

      await inventoryDocumentService.submit({
        document_type: mode,
        warehouse_id: selectedLocation,
        supplier_id: mode === "in" ? null : selectedSupplier || null,
        ...(mode === "out" ? { sales_amount: Number(salesAmount) } : {}),
        memo: memo || "",
        effective_at: selectedDate.toISOString(),
        idempotency_key: requestKey,
        items: selectedProducts.map(product => ({
          option_id: product.productOptionId,
          quantity: product.quantity,
        })),
      });

      submissionKeyRef.current = null;
      resetTransactionForm(mode);
      closeDrawer();
      router.replace("/documents");
    } catch (error) {
      const message = error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.";
      alert(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    validation,
    mode,
    selectedLocation,
    selectedSupplier,
    selectedProducts,
    selectedDate,
    memo,
    salesAmount,
    user?.id,
    resetTransactionForm,
    closeDrawer,
    router,
  ]);

  return {
    // 상태
    isLoading,
    isFormValid,
    // 폼 상태
    selectedLocation,
    selectedSupplier,
    selectedProducts,
    selectedDate,
    memo,
    salesAmount,
    // 액션
    updateTransactionForm: useCallback(
      (updates: Partial<typeof transactionFormState>) => {
        updateTransactionForm(mode, updates);
      },
      [mode, updateTransactionForm]
    ),
    handleSubmit,
  };
}
