import { useUser } from "@/contexts/UserContext";
import { useInventories } from "@/hooks/useInventories";
import { useFormStateStore } from "@/store/formStateStore";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { mutate } from "swr";
import { transactionFormatter } from "../_lib/transaction-formatter";
import { transactionValidator } from "../_lib/transaction-validator";
import { transactionService } from "../_services/transaction-service";

/**
 * 입출고 거래 폼 비즈니스 로직 훅
 */
export function useTransactionForm(mode: "in" | "out", closeDrawer: () => void) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const user = useUser();
  const { inventories } = useInventories();
  const transactionFormState = useFormStateStore(state => state.transactionForms[mode]);
  const updateTransactionForm = useFormStateStore(state => state.updateTransactionForm);
  const resetTransactionForm = useFormStateStore(state => state.resetTransactionForm);
  const { selectedLocation, selectedSupplier, selectedProducts, selectedDate, memo } = transactionFormState;

  // 폼 검증
  const validation = useMemo(
    () =>
      transactionValidator.validateTransactionForm({
        selectedLocation,
        selectedSupplier,
        selectedProducts,
        mode,
      }),
    [selectedLocation, selectedSupplier, selectedProducts, mode]
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

      const formattedData = transactionFormatter.formatTransactionData({
        type: mode,
        warehouse_id: selectedLocation,
        supplier_id: selectedSupplier,
        memo: memo || "",
        selectedDate,
        selectedProducts,
        user_id: user.id,
      });

      await transactionService.create(formattedData);

      await Promise.all([
        mutate("inventories"),
        mutate(["transaction-history", inventories.length]),
      ]);
      resetTransactionForm(mode);
      closeDrawer();
      router.replace("/transactions");
    } catch (error) {
      alert("처리 중 오류가 발생했습니다.");
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
    user?.id,
    inventories.length,
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
