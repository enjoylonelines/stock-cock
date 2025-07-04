import { supabase } from "../supabase";

// 회원가입
export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          email_confirmed: true, // 이메일 인증 상태를 true로 설정
        },
      },
    });

    if (error) throw error;

    // 회원가입 후 바로 로그인
    if (data.user) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
    }

    return data;
  } catch (error) {
    console.error("회원가입 실패:", error);
    throw error;
  }
}

// 로그인
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("로그인 실패:", error);
    throw error;
  }
}

// 로그아웃
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("로그아웃 실패:", error);
    throw error;
  }
}

// 현재 사용자 정보 가져오기
export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error("사용자 정보 조회 실패:", error);
    throw error;
  }
}
