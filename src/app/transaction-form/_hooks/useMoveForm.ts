import { useUser } from "@/contexts/UserContext";
import { useInventories } from "@/hooks/useInventories";
import { useFormStateStore } from "@/store/formStateStore";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { mutate } from "swr";
import { transactionFormatter } from "../_lib/transaction-formatter";
import { transactionValidator } from "../_lib/transaction-validator";
import { moveService } from "../_services/transaction-service";

/**
 * 재고 이동 폼 비즈니스 로직 훅
 */
export function useMoveForm(closeDrawer: () => void) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const user = useUser();
  const { inventories } = useInventories();
  const moveForm = useFormStateStore(state => state.moveForm);
  const updateMoveForm = useFormStateStore(state => state.updateMoveForm);
  const resetMoveForm = useFormStateStore(state => state.resetMoveForm);
  const { fromLocation, toLocation, selectedProducts, selectedDate, memo } = moveForm;

  // 폼 검증
  const validation = transactionValidator.validateMoveForm({
    fromLocation,
    toLocation,
    selectedProducts,
  });

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

      const formattedData = transactionFormatter.formatMoveData({
        from_warehouse_id: fromLocation,
        to_warehouse_id: toLocation,
        memo: memo || "",
        selectedDate,
        selectedProducts,
        user_id: user.id,
      });

      await moveService.create(formattedData);

      await Promise.all([
        mutate("inventories"),
        mutate(["transaction-history", inventories.length]),
      ]);
      resetMoveForm();
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
    fromLocation,
    toLocation,
    selectedProducts,
    selectedDate,
    memo,
    user?.id,
    inventories.length,
    resetMoveForm,
    closeDrawer,
    router,
  ]);

  return {
    // 상태
    isLoading,
    isFormValid,
    // 폼 상태
    fromLocation,
    toLocation,
    selectedProducts,
    selectedDate,
    memo,
    // 액션
    updateMoveForm,
    handleSubmit,
  };
}
