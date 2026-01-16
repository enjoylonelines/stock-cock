import { sendPushNotification } from "@/services/push-notification";
import { getProductIconUrl } from "@/utils/product-icon";
import { sendTransactionNotification } from "@/utils/transaction-notification";

// Supabase 모킹 (환경 변수 문제 방지)
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// 모킹
jest.mock("@/services/push-notification");
jest.mock("@/utils/product-icon");
jest.mock("@/utils/logger", () => ({
  apiLogger: {
    requestError: jest.fn(),
  },
}));

describe("sendTransactionNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("트랜잭션 타입별 알림", () => {
    it("입고(in) 알림을 전송한다", async () => {
      (sendPushNotification as jest.Mock).mockResolvedValue(true);

      const result = await sendTransactionNotification({
        type: "in",
        transactionId: "tx-123",
        itemCount: 5,
        firstOptionId: "option-123",
      });

      expect(result).toBe(true);
      expect(sendPushNotification).toHaveBeenCalledWith({
        title: "입고 완료",
        body: "5개 제품이 입고되었습니다",
        icon: undefined,
        tag: "in-tx-123",
        data: {
          type: "transaction",
          transactionId: "tx-123",
          transactionType: "in",
        },
      });
    });

    it("출고(out) 알림을 전송한다", async () => {
      (sendPushNotification as jest.Mock).mockResolvedValue(true);

      const result = await sendTransactionNotification({
        type: "out",
        transactionId: "tx-456",
        itemCount: 3,
        firstOptionId: "option-456",
      });

      expect(result).toBe(true);
      expect(sendPushNotification).toHaveBeenCalledWith({
        title: "출고 완료",
        body: "3개 제품이 출고되었습니다",
        icon: undefined,
        tag: "out-tx-456",
        data: {
          type: "transaction",
          transactionId: "tx-456",
          transactionType: "out",
        },
      });
    });

    it("조정(adjust) 알림을 전송한다", async () => {
      (sendPushNotification as jest.Mock).mockResolvedValue(true);

      const result = await sendTransactionNotification({
        type: "adjust",
        transactionId: "tx-789",
        itemCount: 10,
        firstOptionId: "option-789",
      });

      expect(result).toBe(true);
      expect(sendPushNotification).toHaveBeenCalledWith({
        title: "재고 조정 완료",
        body: "10개 제품의 재고가 조정되었습니다",
        icon: undefined,
        tag: "adjust-tx-789",
        data: {
          type: "adjustment",
          transactionId: "tx-789",
          transactionType: undefined,
        },
      });
    });

    it("이동(move) 알림을 전송한다", async () => {
      (sendPushNotification as jest.Mock).mockResolvedValue(true);

      const result = await sendTransactionNotification({
        type: "move",
        transactionId: "tx-101",
        itemCount: 7,
        firstOptionId: "option-101",
      });

      expect(result).toBe(true);
      expect(sendPushNotification).toHaveBeenCalledWith({
        title: "재고 이동 완료",
        body: "7개 제품이 이동되었습니다",
        icon: undefined,
        tag: "move-tx-101",
        data: {
          type: "move",
          transactionId: "tx-101",
          transactionType: undefined,
        },
      });
    });
  });

  describe("아이콘 URL 결정 로직", () => {
    it("productImageUrl이 제공되면 우선 사용한다", async () => {
      (sendPushNotification as jest.Mock).mockResolvedValue(true);

      await sendTransactionNotification({
        type: "in",
        transactionId: "tx-123",
        itemCount: 1,
        productImageUrl: "https://example.com/image.jpg",
        firstOptionId: "option-123",
      });

      expect(getProductIconUrl).not.toHaveBeenCalled();
      expect(sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: "https://example.com/image.jpg",
        })
      );
    });

    it("productImageUrl이 없으면 firstOptionId로 조회한다", async () => {
      (getProductIconUrl as jest.Mock).mockResolvedValue("https://example.com/product.jpg");
      (sendPushNotification as jest.Mock).mockResolvedValue(true);

      await sendTransactionNotification({
        type: "in",
        transactionId: "tx-123",
        itemCount: 1,
        firstOptionId: "option-123",
      });

      expect(getProductIconUrl).toHaveBeenCalledWith("option-123");
      expect(sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: "https://example.com/product.jpg",
        })
      );
    });

    it("getProductIconUrl이 기본값을 반환하면 icon을 undefined로 설정한다", async () => {
      (getProductIconUrl as jest.Mock).mockResolvedValue("/icons/logo-192x192.png");
      (sendPushNotification as jest.Mock).mockResolvedValue(true);

      await sendTransactionNotification({
        type: "in",
        transactionId: "tx-123",
        itemCount: 1,
        firstOptionId: "option-123",
      });

      expect(sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: undefined,
        })
      );
    });

    it("firstOptionId가 없으면 icon을 undefined로 설정한다", async () => {
      (sendPushNotification as jest.Mock).mockResolvedValue(true);

      await sendTransactionNotification({
        type: "in",
        transactionId: "tx-123",
        itemCount: 1,
      });

      expect(getProductIconUrl).not.toHaveBeenCalled();
      expect(sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: undefined,
        })
      );
    });
  });

  describe("에러 처리", () => {
    it("알림 전송 실패 시 false를 반환하고 에러를 로깅한다", async () => {
      const { apiLogger } = require("@/utils/logger");
      const error = new Error("알림 전송 실패");
      (getProductIconUrl as jest.Mock).mockRejectedValue(error);

      const result = await sendTransactionNotification({
        type: "in",
        transactionId: "tx-123",
        itemCount: 1,
        firstOptionId: "option-123",
      });

      expect(result).toBe(false);
      expect(apiLogger.requestError).toHaveBeenCalledWith("transaction-notification", error, expect.any(Object));
    });

    it("sendPushNotification 실패 시 false를 반환한다", async () => {
      (sendPushNotification as jest.Mock).mockResolvedValue(false);

      const result = await sendTransactionNotification({
        type: "in",
        transactionId: "tx-123",
        itemCount: 1,
      });

      expect(result).toBe(false);
    });
  });

  describe("태그 및 데이터 생성", () => {
    it("올바른 태그 형식을 생성한다", async () => {
      (sendPushNotification as jest.Mock).mockResolvedValue(true);

      await sendTransactionNotification({
        type: "in",
        transactionId: "tx-abc-123",
        itemCount: 1,
      });

      expect(sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: "in-tx-abc-123",
        })
      );
    });

    it("각 트랜잭션 타입에 맞는 데이터 구조를 생성한다", async () => {
      (sendPushNotification as jest.Mock).mockResolvedValue(true);

      await sendTransactionNotification({
        type: "in",
        transactionId: "tx-123",
        itemCount: 1,
      });

      expect(sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            type: "transaction",
            transactionId: "tx-123",
            transactionType: "in",
          },
        })
      );
    });
  });
});
