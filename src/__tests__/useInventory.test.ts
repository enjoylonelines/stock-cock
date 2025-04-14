// 출고 로직 핸들러

import { renderHook, act } from "@testing-library/react";
import { useInventory } from "@/hooks/useInventory";

describe("useInventory Hook", () => {
  const mockProduct = {
    id: "1",
    name: "김치왕만두",
    stock: 100,
    minStock: 20,
    maxStock: 200,
  };

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useInventory(mockProduct));

    expect(result.current.stock).toBe(100);
    expect(result.current.isLowStock).toBe(false);
  });

  it("should handle stock release correctly", () => {
    const { result } = renderHook(() => useInventory(mockProduct));

    act(() => {
      result.current.release(5);
    });

    expect(result.current.stock).toBe(95);
  });

  it("should prevent stock from going below 0", () => {
    const { result } = renderHook(() => useInventory(mockProduct));

    act(() => {
      result.current.release(150);
    });

    expect(result.current.stock).toBe(0);
    expect(result.current.isLowStock).toBe(true);
  });

  it("should handle stock receipt correctly", () => {
    const { result } = renderHook(() => useInventory(mockProduct));

    act(() => {
      result.current.receive(50);
    });

    expect(result.current.stock).toBe(150);
  });

  it("should prevent stock from exceeding maximum", () => {
    const { result } = renderHook(() => useInventory(mockProduct));

    act(() => {
      result.current.receive(150);
    });

    expect(result.current.stock).toBe(200);
  });

  it("should update low stock status correctly", () => {
    const { result } = renderHook(() => useInventory(mockProduct));

    // 초기에는 재고가 충분
    expect(result.current.isLowStock).toBe(false);

    // 최소 재고 미만으로 감소
    act(() => {
      result.current.release(85);
    });

    expect(result.current.stock).toBe(15);
    expect(result.current.isLowStock).toBe(true);

    // 다시 재고 보충
    act(() => {
      result.current.receive(30);
    });

    expect(result.current.stock).toBe(45);
    expect(result.current.isLowStock).toBe(false);
  });

  it("should validate quantity inputs", () => {
    const { result } = renderHook(() => useInventory(mockProduct));

    act(() => {
      result.current.release(-5); // 음수는 무시
    });
    expect(result.current.stock).toBe(100);

    act(() => {
      result.current.receive(-10); // 음수는 무시
    });
    expect(result.current.stock).toBe(100);

    act(() => {
      result.current.release(0); // 0은 무시
    });
    expect(result.current.stock).toBe(100);
  });
});
