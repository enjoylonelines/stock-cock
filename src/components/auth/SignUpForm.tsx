"use client";
import { useActionState, useEffect, useRef } from "react";

import { signup } from "@/app/auth/actions";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useRouter } from "next/navigation";

export default function SignUpForm() {
  const [formState, formAction, isPending] = useActionState(signup, { error: "", success: false } as { error?: string; success?: boolean });
  const router = useRouter();
  const { requestPermission, subscribe } = usePushNotifications();
  const handledRef = useRef(false);

  // 회원가입 성공 후 권한 요청 및 구독 처리 (한 번만 실행)
  useEffect(() => {
    if (!formState?.success || handledRef.current) return;
    handledRef.current = true;

    (async () => {
      try {
        const granted = await requestPermission();
        if (granted) {
          await subscribe();
        }
      } catch (e) {
        console.warn("푸시 권한/구독 시도 중 경고:", e);
      } finally {
        router.push("/auth/signin");
      }
    })();
    // 의존성은 성공 플래그만 사용하여 재실행 방지
  }, [formState?.success]);

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
