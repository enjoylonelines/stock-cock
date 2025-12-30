import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          // PWA 환경에서 세션 지속성을 위해 쿠키 옵션 개선
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = {
              ...options,
              // 쿠키가 최소 30일 동안 유지되도록 설정
              maxAge: options?.maxAge ?? 60 * 60 * 24 * 30, // 30일
              // PWA 환경에서도 쿠키가 작동하도록 SameSite 설정
              sameSite: options?.sameSite ?? ("lax" as const),
              // HTTPS 환경에서는 secure 플래그 설정
              secure: options?.secure ?? process.env.NODE_ENV === "production",
              // 쿠키가 모든 경로에서 접근 가능하도록 설정
              path: options?.path ?? "/",
            };
            cookieStore.set(name, value, cookieOptions);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
