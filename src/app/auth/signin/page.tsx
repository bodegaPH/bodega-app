import { SignInForm } from "@/features/auth";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="w-full h-96 bg-zinc-950 animate-pulse border border-white/10"></div>}>
      <SignInForm />
    </Suspense>
  );
}
