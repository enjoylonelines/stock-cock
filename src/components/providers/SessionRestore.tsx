"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * iOS PWA 환경에서 localStorage의 세션을 확인하고
 * 세션이 있으면 자동으로 세션을 복원하여 서버 쿠키를 설정하는 컴포넌트
 *
 * iOS PWA는 Safari와 쿠키를 공유하지 않으므로, 앱을 종료하고 다시 시작하면
 * 서버 쿠키가 사라집니다. 하지만 localStorage의 세션은 유지되므로,
 * 클라이언트에서 세션을 확인하고 API를 통해 서버 쿠키를 복원합니다.
 */
export function SessionRestore() {
  const router = useRouter();
  const pathname = usePathname();
  const hasRestored = useRef(false);
  const isRestoring = useRef(false);

  useEffect(() => {
    // 이미 복원했거나 복원 중이면 건너뛰기
    if (hasRestored.current || isRestoring.current) return;

    // auth 페이지에서는 실행하지 않음
    if (pathname.startsWith("/auth")) return;

    const restoreSession = async () => {
      isRestoring.current = true;

      try {
        const supabase = createClient();

        // 현재 세션 확인 (localStorage에서 읽음)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        // 세션이 있으면 서버 쿠키를 복원
        if (session && !sessionError && session.access_token && session.refresh_token) {
          // API를 통해 서버 쿠키에 세션 저장
          const response = await fetch("/api/auth/restore-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
            }),
          });

          if (response.ok) {
            // 세션 복원 성공 - 페이지를 새로고침하여 서버 쿠키가 적용되도록 함
            // 주의: 무한 루프를 방지하기 위해 한 번만 실행
            if (!hasRestored.current) {
              hasRestored.current = true;
              // 페이지를 새로고침하여 middleware가 새 쿠키를 확인하도록 함
              window.location.reload();
            }
          }
        }
      } catch (error) {
        console.error("세션 복원 오류:", error);
      } finally {
        isRestoring.current = false;
      }
    };

    // 약간의 지연 후 실행 (페이지 로드 완료 후)
    const timer = setTimeout(restoreSession, 100);
    return () => clearTimeout(timer);
  }, [pathname, router]);

  return null;
}
