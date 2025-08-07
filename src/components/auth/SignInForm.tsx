"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { login } from "@/app/auth/actions";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formState, formAction, isPending] = useActionState(login, { error: "" });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          이메일
        </label>
        <input
          type="email"
          id="email"
          name="email"
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
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="block px-3 py-2 mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500"
          placeholder="비밀번호를 입력하세요"
        />
      </div>

      {formState?.error && <div className="text-sm text-red-600">{formState.error}</div>}

      <Button type="submit" className="w-full text-white bg-orange-500 hover:bg-orange-600" disabled={isPending}>
        {isPending ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}
