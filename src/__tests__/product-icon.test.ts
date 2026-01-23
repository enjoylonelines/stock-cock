import { createClient } from "@/lib/supabase/client";
import { getProductIconUrl, getProductIconUrlByProductId } from "@/utils/product-icon";

// supabase 모킹
const supabase = { from: jest.fn() } as { from: jest.Mock };

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => supabase,
}));

describe("getProductIconUrlByProductId", () => {
  const DEFAULT_ICON = "/icons/logo-192x192.png";
  const productId = "product-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("제품 이미지 URL을 반환한다", async () => {
    const mockData = { image_url: "https://example.com/image.jpg" };

    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: selectMock,
    });

    const result = await getProductIconUrlByProductId(productId);

    expect(result).toBe("https://example.com/image.jpg");
    expect(selectMock).toHaveBeenCalledWith("image_url");
  });

  it("이미지 URL이 없는 경우 기본 아이콘을 반환한다", async () => {
    const mockData = { image_url: null };

    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: selectMock,
    });

    const result = await getProductIconUrlByProductId(productId);

    expect(result).toBe(DEFAULT_ICON);
  });

  it("제품을 찾을 수 없는 경우 기본 아이콘을 반환한다", async () => {
    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: selectMock,
    });

    const result = await getProductIconUrlByProductId(productId);

    expect(result).toBe(DEFAULT_ICON);
  });

  it("에러 발생 시 기본 아이콘을 반환한다", async () => {
    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "조회 실패" },
        }),
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: selectMock,
    });

    const result = await getProductIconUrlByProductId(productId);

    expect(result).toBe(DEFAULT_ICON);
  });

  it("예외 발생 시 기본 아이콘을 반환한다", async () => {
    (supabase.from as jest.Mock).mockImplementation(() => {
      throw new Error("예외 발생");
    });

    const result = await getProductIconUrlByProductId(productId);

    expect(result).toBe(DEFAULT_ICON);
  });
});

describe("getProductIconUrl", () => {
  const DEFAULT_ICON = "/icons/logo-192x192.png";
  const optionId = "option-123";
  const productId = "product-456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("옵션 ID로 제품 이미지 URL을 가져온다", async () => {
    const mockOptionData = { product_id: productId };
    const mockProductData = { image_url: "https://example.com/image.jpg" };

    let callCount = 0;
    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // 첫 번째 호출: product_options 조회
            return Promise.resolve({
              data: mockOptionData,
              error: null,
            });
          }
          // 두 번째 호출: products 조회 (getProductIconUrlByProductId 내부)
          return Promise.resolve({
            data: mockProductData,
            error: null,
          });
        }),
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: selectMock,
    });

    const result = await getProductIconUrl(optionId);

    expect(result).toBe("https://example.com/image.jpg");
    expect(selectMock).toHaveBeenCalledTimes(2);
  });

  it("옵션을 찾을 수 없는 경우 기본 아이콘을 반환한다", async () => {
    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: selectMock,
    });

    const result = await getProductIconUrl(optionId);

    expect(result).toBe(DEFAULT_ICON);
  });

  it("옵션 조회 에러 시 기본 아이콘을 반환한다", async () => {
    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "조회 실패" },
        }),
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: selectMock,
    });

    const result = await getProductIconUrl(optionId);

    expect(result).toBe(DEFAULT_ICON);
  });

  it("product_id가 없는 경우 기본 아이콘을 반환한다", async () => {
    const mockOptionData = { product_id: null };

    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockOptionData,
          error: null,
        }),
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: selectMock,
    });

    const result = await getProductIconUrl(optionId);

    expect(result).toBe(DEFAULT_ICON);
  });

  it("예외 발생 시 기본 아이콘을 반환한다", async () => {
    (supabase.from as jest.Mock).mockImplementation(() => {
      throw new Error("예외 발생");
    });

    const result = await getProductIconUrl(optionId);

    expect(result).toBe(DEFAULT_ICON);
  });

  it("getProductIconUrlByProductId를 재사용한다", async () => {
    // getProductIconUrl이 getProductIconUrlByProductId를 호출하는지 확인
    const mockOptionData = { product_id: productId };
    const mockProductData = { image_url: "https://example.com/product.jpg" };

    let callCount = 0;
    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              data: mockOptionData,
              error: null,
            });
          }
          return Promise.resolve({
            data: mockProductData,
            error: null,
          });
        }),
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: selectMock,
    });

    const result = await getProductIconUrl(optionId);

    // getProductIconUrlByProductId의 로직이 실행되었는지 확인
    expect(result).toBe("https://example.com/product.jpg");
  });
});
