// api 예외 상황 테스트

import { APIError } from "@/utils/api-error";

describe("API Error Handling", () => {
  const mockFetch = async (shouldFail: boolean = false) => {
    if (shouldFail) {
      throw new Error("Network error");
    }
    // Response 객체를 직접 모킹
    return {
      ok: true,
      status: 200,
      json: async () => ({ name: "김치왕만두", stock: 100 }),
    };
  };

  const callAPI = async (itemCode: string) => {
    try {
      if (!itemCode) {
        throw APIError.badRequest("상품 코드가 필요합니다.");
      }

      const response = await mockFetch(itemCode === "ERROR");
      if (!response.ok) {
        throw APIError.internalServer();
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internalServer();
    }
  };

  it("should handle successful API call", async () => {
    const result = await callAPI("TEST001");
    expect(result).toEqual({ name: "김치왕만두", stock: 100 });
  });

  it("should handle missing item code", async () => {
    await expect(callAPI("")).rejects.toThrow("상품 코드가 필요합니다.");
  });

  it("should handle network errors", async () => {
    await expect(callAPI("ERROR")).rejects.toThrow("서버 오류가 발생했습니다.");
  });

  it("should create correct error instances", () => {
    const badRequestError = APIError.badRequest("잘못된 요청");
    expect(badRequestError.statusCode).toBe(400);
    expect(badRequestError.message).toBe("잘못된 요청");
    expect(badRequestError.code).toBe("BAD_REQUEST");

    const unauthorizedError = APIError.unauthorized();
    expect(unauthorizedError.statusCode).toBe(401);
    expect(unauthorizedError.message).toBe("인증이 필요합니다.");
    expect(unauthorizedError.code).toBe("UNAUTHORIZED");
  });
});
