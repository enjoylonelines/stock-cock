import { productFilter, type ProductType } from "../_lib/product-filter";
import { useProducts } from "@/hooks/useProducts";
import { useProductFilterDrawerStore } from "@/store/productFilterDrawer";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const TAB_STORAGE_KEY = "products_selected_tab";
const SCROLL_STORAGE_KEY = "products_scroll_position";

/**
 * 제품 목록 비즈니스 로직 훅
 */
export function useProductList() {
  const { products, isLoading } = useProducts();
  const { filters, setFilters } = useProductFilterDrawerStore();
  const [searchInput, setSearchInput] = useState(filters.searchQuery || "");
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL 쿼리 파라미터 또는 sessionStorage에서 탭 읽기
  const getInitialTab = (): ProductType => {
    const tabFromUrl = searchParams.get("tab") as ProductType | null;
    if (tabFromUrl && ["all", "company", "franchise", "pb", "material"].includes(tabFromUrl)) {
      return tabFromUrl;
    }

    // sessionStorage에서 읽기
    if (typeof window !== "undefined") {
      const tabFromStorage = sessionStorage.getItem(TAB_STORAGE_KEY) as ProductType | null;
      if (tabFromStorage && ["all", "company", "franchise", "pb", "material"].includes(tabFromStorage)) {
        return tabFromStorage;
      }
    }

    return "company";
  };

  const [selectedTab, setSelectedTab] = useState<ProductType>(getInitialTab);

  // URL 쿼리 파라미터 변경 시 탭 상태 동기화
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as ProductType | null;
    if (tabFromUrl && ["all", "company", "franchise", "pb", "material"].includes(tabFromUrl)) {
      if (tabFromUrl !== selectedTab) {
        setSelectedTab(tabFromUrl);
        // sessionStorage에도 저장
        if (typeof window !== "undefined") {
          sessionStorage.setItem(TAB_STORAGE_KEY, tabFromUrl);
        }
      }
    }
  }, [searchParams, selectedTab]);

  // 스크롤 위치 저장 (탭별로)
  const saveScrollPosition = useCallback((tab: ProductType) => {
    if (typeof window !== "undefined") {
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollData = JSON.parse(sessionStorage.getItem(SCROLL_STORAGE_KEY) || "{}");
      scrollData[tab] = scrollY;
      sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(scrollData));
    }
  }, []);

  // 스크롤 위치 복원 (탭별로)
  const restoreScrollPosition = useCallback((tab: ProductType) => {
    if (typeof window !== "undefined") {
      const scrollData = JSON.parse(sessionStorage.getItem(SCROLL_STORAGE_KEY) || "{}");
      const savedPosition = scrollData[tab];
      if (savedPosition !== undefined && savedPosition > 0) {
        // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 스크롤
        setTimeout(() => {
          window.scrollTo({ top: savedPosition, behavior: "auto" });
        }, 100);
      }
    }
  }, []);

  // 스크롤 이벤트 핸들러 (디바운스)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        saveScrollPosition(selectedTab);
      }, 150); // 150ms 디바운스
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [selectedTab, saveScrollPosition]);

  // 페이지 마운트 시 스크롤 위치 복원
  useEffect(() => {
    if (!isLoading) {
      // DOM이 완전히 렌더링된 후 스크롤 복원
      const timer = setTimeout(() => {
        restoreScrollPosition(selectedTab);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, selectedTab, restoreScrollPosition]);

  // URL 변경 시 스크롤 위치 복원 (뒤로 가기 등)
  useEffect(() => {
    const handlePopState = () => {
      // 약간의 지연을 두어 페이지가 완전히 렌더링된 후 스크롤
      setTimeout(() => {
        restoreScrollPosition(selectedTab);
      }, 200);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedTab, restoreScrollPosition]);

  // 탭 변경 시 URL과 sessionStorage 업데이트
  const handleTabChange = useCallback(
    (value: ProductType) => {
      // 현재 탭의 스크롤 위치 저장
      saveScrollPosition(selectedTab);

      setSelectedTab(value);

      // sessionStorage에 저장
      if (typeof window !== "undefined") {
        sessionStorage.setItem(TAB_STORAGE_KEY, value);
      }

      // URL 쿼리 파라미터 업데이트
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`/products?${params.toString()}`, { scroll: false });

      // 새 탭의 스크롤 위치 복원 (약간의 지연 후)
      setTimeout(() => {
        restoreScrollPosition(value);
      }, 50);
    },
    [searchParams, router, selectedTab, saveScrollPosition, restoreScrollPosition]
  );

  // Debounce 검색 입력
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.searchQuery) {
        setFilters({ ...filters, searchQuery: searchInput });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, filters, setFilters]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  // 탭별 제품 필터링
  const filteredProducts = useMemo(() => {
    return productFilter.filterProducts(products, {
      productType: selectedTab,
      searchQuery: filters.searchQuery,
    });
  }, [products, selectedTab, filters.searchQuery]);

  return {
    // 상태
    isLoading,
    searchInput,
    selectedTab,
    filteredProducts,
    // 핸들러
    handleSearchChange,
    handleTabChange,
  };
}
