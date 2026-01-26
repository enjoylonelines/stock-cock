import SignUpForm from "../_components/SignUpForm";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <>
      <div>
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-center text-gray-900">회원가입</h2>
        <p className="mt-2 text-sm text-center text-gray-600">
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/signin" className="font-medium text-orange-600 hover:text-orange-500">
            로그인하기
          </Link>
        </p>
      </div>
      <SignUpForm />
    </>
  );
}
