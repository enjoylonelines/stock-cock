/**
 * API 에러 클래스
 * 표준화된 에러 처리를 위한 커스텀 에러 클래스
 */
export class APIError extends Error {
  /** 클라이언트에 전달할 추가 상세(예: DB hint, details) */
  public detail?: string;

  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    detail?: string
  ) {
    super(message);
    this.name = "APIError";
    this.detail = detail;
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

  static fromSupabaseError(error: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  }): APIError {
    const message = error.message || "데이터베이스 오류가 발생했습니다.";
    const parts = [error.details, error.hint].filter(Boolean);
    const detail = parts.length > 0 ? parts.join(" | ") : undefined;
    return new APIError(500, message, error.code || "DATABASE_ERROR", detail);
  }
}
