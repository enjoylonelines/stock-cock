/**
 * 클라이언트 사이드 로깅 유틸리티
 * 개발 환경에서만 로그 출력, 프로덕션에서는 에러만
 */

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * 클라이언트 로거
 */
export const clientLogger = {
  /**
   * 디버그 로그 (개발 환경에서만)
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * 정보 로그 (개발 환경에서만)
   */
  info: (message: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * 경고 로그
   */
  warn: (message: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  /**
   * 에러 로그 (항상 출력)
   */
  error: (message: string, error?: Error | unknown, ...args: unknown[]): void => {
    if (error instanceof Error) {
      console.error(`[ERROR] ${message}`, error, ...args);
    } else {
      console.error(`[ERROR] ${message}`, error, ...args);
    }
  },
};
