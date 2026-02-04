/**
 * 구조화된 로깅 시스템
 * 개발 환경에서는 상세 로그, 프로덕션에서는 에러만 출력
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

/**
 * 로그 레벨별 출력 여부 결정
 */
function shouldLog(level: LogLevel): boolean {
  if (isDevelopment) {
    return true; // 개발 환경에서는 모든 로그 출력
  }

  // 프로덕션 환경에서는 warn, error만 출력
  return level === "warn" || level === "error";
}

/**
 * 로그 포맷팅
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * 로거 클래스
 */
class Logger {
  /**
   * 디버그 로그 (개발 환경에서만)
   */
  debug(message: string, context?: LogContext): void {
    if (shouldLog("debug")) {
      console.debug(formatLog("debug", message, context));
    }
  }

  /**
   * 정보 로그
   */
  info(message: string, context?: LogContext): void {
    if (shouldLog("info")) {
      console.info(formatLog("info", message, context));
    }
  }

  /**
   * 경고 로그
   */
  warn(message: string, context?: LogContext): void {
    if (shouldLog("warn")) {
      console.warn(formatLog("warn", message, context));
    }
  }

  /**
   * 에러 로그
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (shouldLog("error")) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
      console.error(formatLog("error", message, errorContext));
    }
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();

/**
 * API 라우트에서 사용할 편의 함수
 */
export const apiLogger = {
  /**
   * 요청 시작 로그
   */
  requestStart(endpoint: string, body?: unknown): void {
    logger.debug(`[API] ${endpoint} 요청 시작`, body ? { body } : undefined);
  },

  /**
   * 요청 성공 로그
   */
  requestSuccess(endpoint: string, data?: unknown): void {
    logger.info(`[API] ${endpoint} 요청 성공`, data ? { data } : undefined);
  },

  /**
   * 요청 실패 로그
   */
  requestError(endpoint: string, error: Error | unknown, context?: LogContext): void {
    logger.error(`[API] ${endpoint} 요청 실패`, error, context);
  },

  /**
   * 데이터베이스 오류 로그 (Supabase details/hint 포함)
   */
  dbError(operation: string, error: Error | unknown): void {
    const err = error as { message?: string; code?: string; details?: string; hint?: string };
    const context =
      err && typeof err === "object"
        ? {
            message: err.message,
            code: err.code,
            ...(err.details && { details: err.details }),
            ...(err.hint && { hint: err.hint }),
          }
        : undefined;
    logger.error(`[DB] ${operation} 실패`, error, context);
  },

  /**
   * 트랜잭션 로그
   */
  transaction(operation: string, data?: unknown): void {
    logger.debug(`[TX] ${operation}`, data ? { data } : undefined);
  },
};
