// app/login/actions.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string) {
  return password.length >= 6; // 기본적으로 6자 이상은 돼야지
}

export async function login(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력하세요." };
  }

  if (!validateEmail(email)) {
    return { error: "이메일 형식이 올바르지 않습니다." };
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error?.message.includes("Invalid")) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }
  if (error) {
    return { error: `로그인 실패: ${error.message}` };
  }

  // profiles 테이블에 사용자 정보가 있는지 확인
  if (authData.user?.id) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      // profiles 테이블에 정보가 없으면 로그아웃 처리
      await supabase.auth.signOut();
      return { error: "프로필 정보가 없습니다. 관리자에게 문의하세요." };
    }
  }

  redirect("/home");
}

export async function signup(_prevState: unknown, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!name || !email || !password || !confirm) {
    return { error: "모든 필드를 입력하세요." };
  }

  if (name.trim().length < 2) {
    return { error: "이름은 두글자 이상이어야 합니다." };
  }

  if (password !== confirm) {
    return { error: "비밀번호가 일치하지 않습니다." };
  }

  if (!validatePassword(password)) {
    return { error: "비밀번호는 6자 이상이어야 합니다." };
  }

  const supabase = await createClient();
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: `회원가입 실패: ${error.message}` };
  }

  const userId = signUpData.user?.id;

  if (userId) {
    const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: userId,
        name: name,
      },
    ]);
    if (profileError) {
      return { error: `회원가입 실패: ${profileError.message}` };
    }
  }

  // redirect는 클라이언트에서 권한 요청/구독 후에 수행
  return { success: true } as const;
}

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("로그아웃 실패:", error.message);
    throw new Error("로그아웃 실패");
  }

  // 리다이렉트
  redirect("/auth/signin");
}
