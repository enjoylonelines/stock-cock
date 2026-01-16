/**
 * API 에러 클래스
 * 표준화된 에러 처리를 위한 커스텀 에러 클래스
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "APIError";
    // Error 상속 시 stack trace 유지
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  static badRequest(message: string) {
    return new APIError(400, message, "BAD_REQUEST");
  }

  static unauthorized(message = "인증이 필요합니다.") {
    return new APIError(401, message, "UNAUTHORIZED");
  }

  static forbidden(message = "접근 권한이 없습니다.") {
    return new APIError(403, message, "FORBIDDEN");
  }

  static notFound(message = "리소스를 찾을 수 없습니다.") {
    return new APIError(404, message, "NOT_FOUND");
  }

  static internalServer(message = "서버 오류가 발생했습니다.") {
    return new APIError(500, message, "INTERNAL_SERVER_ERROR");
  }

  static fromSupabaseError(error: { message: string; code?: string }): APIError {
    // Supabase 에러 코드에 따라 적절한 HTTP 상태 코드 매핑
    const message = error.message || "데이터베이스 오류가 발생했습니다.";
    return new APIError(500, message, error.code || "DATABASE_ERROR");
  }
}
