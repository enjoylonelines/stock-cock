export class APIError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) {
    super(message);
    this.name = "APIError";
  }

  static badRequest(message: string) {
    return new APIError(400, message, "BAD_REQUEST");
  }

  static unauthorized(message: string = "인증이 필요합니다.") {
    return new APIError(401, message, "UNAUTHORIZED");
  }

  static forbidden(message: string = "접근 권한이 없습니다.") {
    return new APIError(403, message, "FORBIDDEN");
  }

  static notFound(message: string = "리소스를 찾을 수 없습니다.") {
    return new APIError(404, message, "NOT_FOUND");
  }

  static internalServer(message: string = "서버 오류가 발생했습니다.") {
    return new APIError(500, message, "INTERNAL_SERVER_ERROR");
  }
}
