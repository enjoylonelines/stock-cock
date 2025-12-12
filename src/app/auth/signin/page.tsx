import SignInForm from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <>
      <div>
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-center text-gray-900">로그인</h2>
        <p className="mt-2 text-sm text-center text-gray-600">
          계정이 없으신가요?{" "}
          <a href="/auth/signup" className="font-medium text-orange-600 hover:text-orange-500">
            회원가입하기
          </a>
        </p>
      </div>
      <SignInForm />
    </>
  );
}
