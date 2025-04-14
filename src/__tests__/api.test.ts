import { APIError } from "@/utils/api-error";

interface SuccessResponse {
  productId: string;
  stock: number;
  name: string;
}

interface ErrorResponse {
  message: string;
  code: string;
}

describe("Stock API", () => {
  // API 엔드포인트 모킹
  const mockFetch = async (endpoint: string, options: { body: string }) => {
    const data = JSON.parse(options.body);

    switch (endpoint) {
      case "/api/stock/release":
        if (data.quantity > 100) {
          return {
            ok: false,
            status: 400,
            json: async (): Promise<ErrorResponse> => ({
              message: "재고가 부족합니다",
              code: "INSUFFICIENT_STOCK",
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async (): Promise<SuccessResponse> => ({
            productId: data.productId,
            stock: 100 - data.quantity,
            name: "김치왕만두",
          }),
        };

      case "/api/stock/receive":
        if (data.quantity + 100 > 200) {
          return {
            ok: false,
            status: 400,
            json: async (): Promise<ErrorResponse> => ({
              message: "최대 보관 수량을 초과했습니다",
              code: "EXCEED_MAX_STOCK",
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async (): Promise<SuccessResponse> => ({
            productId: data.productId,
            stock: 100 + data.quantity,
            name: "김치왕만두",
          }),
        };

      default:
        throw new Error("Unknown endpoint");
    }
  };

  // 테스트용 API 클라이언트
  const stockAPI = {
    async release(productId: string, quantity: number): Promise<SuccessResponse> {
      const response = await mockFetch("/api/stock/release", {
        body: JSON.stringify({ productId, quantity }),
      });

      if (!response.ok) {
        const error = (await response.json()) as ErrorResponse;
        throw new APIError(response.status, error.message, error.code);
      }

      return response.json() as Promise<SuccessResponse>;
    },

    async receive(productId: string, quantity: number): Promise<SuccessResponse> {
      const response = await mockFetch("/api/stock/receive", {
        body: JSON.stringify({ productId, quantity }),
      });

      if (!response.ok) {
        const error = (await response.json()) as ErrorResponse;
        throw new APIError(response.status, error.message, error.code);
      }

      return response.json() as Promise<SuccessResponse>;
    },
  };

  describe("출고 API", () => {
    it("정상적으로 출고되어야 함", async () => {
      const result = await stockAPI.release("1", 5);
      expect(result.stock).toBe(95);
      expect(result.name).toBe("김치왕만두");
    });

    it("재고가 부족할 경우 에러가 발생해야 함", async () => {
      await expect(stockAPI.release("1", 150)).rejects.toThrow("재고가 부족합니다");
    });
  });

  describe("입고 API", () => {
    it("정상적으로 입고되어야 함", async () => {
      const result = await stockAPI.receive("1", 50);
      expect(result.stock).toBe(150);
      expect(result.name).toBe("김치왕만두");
    });

    it("최대 보관 수량 초과 시 에러가 발생해야 함", async () => {
      await expect(stockAPI.receive("1", 150)).rejects.toThrow("최대 보관 수량을 초과했습니다");
    });
  });
});
