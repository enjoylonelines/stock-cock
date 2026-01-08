import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * iOS PWA 환경에서 localStorage의 세션을 서버 쿠키로 복원하는 API
 * 클라이언트에서 localStorage의 세션 토큰을 읽어서 서버 쿠키에 설정
 */
export async function POST(request: Request) {
  try {
    const { accessToken, refreshToken } = await request.json();

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 400 });
    }

    const cookieStore = await cookies();

    // Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "환경 변수가 설정되지 않았습니다." }, { status: 500 });
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options || {});
          });
        },
      },
    });

    // 세션 설정 (Supabase가 자동으로 쿠키에 저장)
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error) {
    // API 라우트는 이미 handleAPIError로 처리되지만, 여기서는 직접 처리
    return NextResponse.json({ error: "세션 복원 실패" }, { status: 500 });
  }
}
