import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center items-center px-4 -mt-14 -mb-20 min-h-screen bg-gray-50 sm:px-6 lg:px-8">
      <div className="space-y-8 w-full max-w-md">{children}</div>
    </div>
  );
}
