import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        // PWA 환경에서 세션 지속성을 위해 쿠키 옵션 개선
        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieOptions = {
            ...options,
            // 쿠키가 최소 30일 동안 유지되도록 설정 (refresh token의 기본 만료 시간에 맞춤)
            maxAge: options?.maxAge ?? 60 * 60 * 24 * 30, // 30일
            // PWA 환경에서도 쿠키가 작동하도록 SameSite 설정
            sameSite: options?.sameSite ?? ("lax" as const),
            // HTTPS 환경에서는 secure 플래그 설정 (개발 환경에서는 false)
            secure: options?.secure ?? process.env.NODE_ENV === "production",
            // 쿠키가 모든 경로에서 접근 가능하도록 설정
            path: options?.path ?? "/",
          };
          supabaseResponse.cookies.set(name, value, cookieOptions);
        });
      },
    },
  });

  // createServerClient와 supabase.auth.getUser() 사이에 코드를 작성하지 마세요.
  // 간단한 실수로도 사용자가 무작위로 로그아웃되는 문제를 디버깅하기가 매우 어려워질 수 있습니다.
  // 중요: auth.getUser()를 제거하지 마세요

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith("/auth")) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  // 사용자가 로그인되어 있지만 profiles 테이블에 정보가 없는 경우 로그아웃 처리
  if (user && !request.nextUrl.pathname.startsWith("/auth")) {
    const { data: profile, error: profileError } = await supabase.from("profiles").select("id").eq("id", user.id).single();

    if (profileError || !profile) {
      // profiles 테이블에 정보가 없으면 로그아웃 처리
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signin";
      return NextResponse.redirect(url);
    }
  }

  // 중요: supabaseResponse 객체를 반드시 그대로 반환해야 합니다.
  // NextResponse.next()로 새로운 response 객체를 생성하는 경우 다음 사항을 반드시 지켜주세요:s
  // 1. 다음과 같이 request를 전달하세요:
  // const myNewResponse = NextResponse.next({ request })

  // 2. 다음과 같이 쿠키를 복사하세요:
  // myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())

  // 3. myNewResponse 객체를 필요에 맞게 수정하되, 쿠키는 변경하지 마세요!

  // 4. 마지막으로:
  // return myNewResponse

  // 이 과정을 지키지 않으면 브라우저와 서버의 동기화가 깨져
  // 사용자 세션이 예기치 않게 종료될 수 있습니다!

  return supabaseResponse;
}
