import { APIError } from "@/utils/api-error";

describe("APIError", () => {
  describe("생성자", () => {
    it("기본 생성자가 올바른 속성을 설정한다", () => {
      const error = new APIError(400, "잘못된 요청", "BAD_REQUEST");

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("잘못된 요청");
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.name).toBe("APIError");
      expect(error).toBeInstanceOf(Error);
    });

    it("code를 선택적으로 설정할 수 있다", () => {
      const error = new APIError(500, "서버 오류");

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("서버 오류");
      expect(error.code).toBeUndefined();
    });
  });

  describe("static 메서드", () => {
    it("badRequest는 400 상태 코드를 반환한다", () => {
      const error = APIError.badRequest("잘못된 요청입니다");

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("잘못된 요청입니다");
      expect(error.code).toBe("BAD_REQUEST");
    });

    it("unauthorized는 401 상태 코드를 반환한다", () => {
      const error = APIError.unauthorized();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("인증이 필요합니다.");
      expect(error.code).toBe("UNAUTHORIZED");
    });

    it("unauthorized는 커스텀 메시지를 받을 수 있다", () => {
      const error = APIError.unauthorized("세션이 만료되었습니다");

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("세션이 만료되었습니다");
      expect(error.code).toBe("UNAUTHORIZED");
    });

    it("forbidden은 403 상태 코드를 반환한다", () => {
      const error = APIError.forbidden();

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("접근 권한이 없습니다.");
      expect(error.code).toBe("FORBIDDEN");
    });

    it("forbidden은 커스텀 메시지를 받을 수 있다", () => {
      const error = APIError.forbidden("관리자만 접근 가능합니다");

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("관리자만 접근 가능합니다");
      expect(error.code).toBe("FORBIDDEN");
    });

    it("notFound는 404 상태 코드를 반환한다", () => {
      const error = APIError.notFound();

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("리소스를 찾을 수 없습니다.");
      expect(error.code).toBe("NOT_FOUND");
    });

    it("notFound는 커스텀 메시지를 받을 수 있다", () => {
      const error = APIError.notFound("제품을 찾을 수 없습니다");

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("제품을 찾을 수 없습니다");
      expect(error.code).toBe("NOT_FOUND");
    });

    it("internalServer는 500 상태 코드를 반환한다", () => {
      const error = APIError.internalServer();

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("서버 오류가 발생했습니다.");
      expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    });

    it("internalServer는 커스텀 메시지를 받을 수 있다", () => {
      const error = APIError.internalServer("데이터베이스 연결 실패");

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("데이터베이스 연결 실패");
      expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    });
  });

  describe("fromSupabaseError", () => {
    it("Supabase 에러를 APIError로 변환한다", () => {
      const supabaseError = {
        message: "Foreign key violation",
        code: "23503",
      };

      const error = APIError.fromSupabaseError(supabaseError);

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Foreign key violation");
      expect(error.code).toBe("23503");
    });

    it("메시지가 없는 경우 기본 메시지를 사용한다", () => {
      const supabaseError = {
        message: "",
        code: "23505",
      };

      const error = APIError.fromSupabaseError(supabaseError);

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("데이터베이스 오류가 발생했습니다.");
      expect(error.code).toBe("23505");
    });

    it("code가 없는 경우 DATABASE_ERROR를 사용한다", () => {
      const supabaseError = {
        message: "Connection timeout",
      };

      const error = APIError.fromSupabaseError(supabaseError);

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Connection timeout");
      expect(error.code).toBe("DATABASE_ERROR");
    });
  });
});
