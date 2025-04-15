import { postToERP } from "@/app/lib/api";

global.fetch = jest.fn();

describe("postToERP", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("정상 응답 시 JSON을 반환한다", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await postToERP({ foo: "bar" });
    expect(result.success).toBe(true);
  });

  it("API 실패 시 에러를 던진다", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(postToERP({ foo: "bar" })).rejects.toThrow("ERP 전송 실패");
  });
});
