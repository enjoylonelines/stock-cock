"use client";
import { useActionState } from "react";
import { signup } from "@/app/auth/actions";

export default function SignUpForm() {
  const [formState, formAction, isPending] = useActionState(signup, { error: "" });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          이름
        </label>
        <input type="text" id="name" name="name" required className="px-3 py-2 w-full rounded border" placeholder="홍길동" />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          이메일
        </label>
        <input type="email" id="email" name="email" required className="px-3 py-2 w-full rounded border" placeholder="example@email.com" />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          비밀번호
        </label>
        <input type="password" id="password" name="password" required className="px-3 py-2 w-full rounded border" placeholder="6자 이상" />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium">
          비밀번호 확인
        </label>
        <input
          type="password"
          id="confirm"
          name="confirm"
          required
          className="px-3 py-2 w-full rounded border"
          placeholder="비밀번호 다시 입력"
        />
      </div>

      {formState?.error && <div className="text-sm text-red-600">{formState.error}</div>}

      <button type="submit" className="px-4 py-2 w-full text-white bg-orange-500 rounded" disabled={isPending}>
        {isPending ? "가입 중..." : "회원가입"}
      </button>
    </form>
  );
}
