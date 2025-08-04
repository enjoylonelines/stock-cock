"use client";

import { useState } from "react";
import { signUp } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { signup } from "@/actions/signup";

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    // 비밀번호 유효성 검사
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    try {
      setIsLoading(true);
      await signUp(email, password);
      alert("회원가입이 완료되었습니다.");
      router.push("/auth/signin"); // 로그인 페이지로 리다이렉트
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("회원가입 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          이메일
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="block px-3 py-2 mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500"
          placeholder="example@email.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          비밀번호
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="block px-3 py-2 mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500"
          placeholder="6자 이상"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          비밀번호 확인
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="block px-3 py-2 mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500"
          placeholder="비밀번호를 다시 입력하세요"
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <Button formAction={signup} type="submit" className="w-full text-white bg-orange-500 hover:bg-orange-600" disabled={isLoading}>
        {isLoading ? "처리 중..." : "회원가입"}
      </Button>
    </form>
  );
}
