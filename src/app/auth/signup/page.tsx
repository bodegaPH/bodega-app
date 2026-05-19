import { SignUpForm } from "@/features/auth";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="w-full h-[500px] bg-zinc-950 animate-pulse border border-white/10"></div>}>
      <SignUpForm />
    </Suspense>
  );
}
