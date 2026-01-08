/**
 * API 라우트 핸들러 유틸리티
 * APIError 처리 및 표준화된 응답 생성
 */

import { NextResponse } from "next/server";
import { APIError } from "@/utils/api-error";
import { apiLogger } from "@/utils/logger";
import type { APIErrorResponse, APISuccessResponse } from "@/types/api";

/**
 * APIError를 NextResponse로 변환
 */
export function handleAPIError(error: unknown, endpoint: string): NextResponse<APIErrorResponse> {
  // APIError 인스턴스인 경우
  if (error instanceof APIError) {
    apiLogger.requestError(endpoint, error, { statusCode: error.statusCode, code: error.code });
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
      },
      { status: error.statusCode }
    );
  }

  // Error 인스턴스인 경우
  if (error instanceof Error) {
    apiLogger.requestError(endpoint, error);
    return NextResponse.json(
      {
        error: error.message || "서버 오류가 발생했습니다.",
        code: "INTERNAL_SERVER_ERROR",
        statusCode: 500,
      },
      { status: 500 }
    );
  }

  // 기타 에러
  const errorMessage = String(error);
  apiLogger.requestError(endpoint, new Error(errorMessage));
  return NextResponse.json(
    {
      error: "서버 오류가 발생했습니다.",
      detail: errorMessage,
      code: "INTERNAL_SERVER_ERROR",
      statusCode: 500,
    },
    { status: 500 }
  );
}

/**
 * API 라우트 래퍼 함수
 * 에러 처리 및 로깅을 자동으로 수행
 */
export function withAPIHandler<T = unknown>(
  handler: () => Promise<T> | T,
  endpoint: string
): Promise<NextResponse<APISuccessResponse<T> | APIErrorResponse>> {
  return Promise.resolve()
    .then(async () => {
      apiLogger.requestStart(endpoint);
      const result = await handler();
      apiLogger.requestSuccess(endpoint, result);

      // NextResponse를 직접 반환하는 경우
      if (result instanceof NextResponse) {
        return result;
      }

      // 일반 데이터를 반환하는 경우
      return NextResponse.json({
        success: true,
        data: result,
      } satisfies APISuccessResponse<T>);
    })
    .catch((error) => {
      return handleAPIError(error, endpoint);
    });
}

