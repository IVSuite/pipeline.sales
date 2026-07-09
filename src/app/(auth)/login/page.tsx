import { Suspense } from "react";
import { LoginForm } from "@/components/shared/auth-form";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
