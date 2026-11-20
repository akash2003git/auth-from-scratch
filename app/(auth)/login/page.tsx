import { Suspense } from "react";
import { LoginForm } from "@/components/forms/login-form";
import { PASSWORD_RESET_SUCCESS_MESSAGE } from "@/lib/auth/messages";
import { getOAuthErrorMessage } from "@/lib/auth/oauth/errors";

type LoginPageProps = {
  searchParams: Promise<{
    reset?: string | string[];
    error?: string | string[];
  }>;
};

async function ResetPasswordNotice({ searchParams }: LoginPageProps) {
  const { reset } = await searchParams;

  if (reset !== "success") {
    return null;
  }

  return (
    <p
      role="status"
      className="w-full max-w-md rounded-md border border-emerald-600/30 bg-emerald-600/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
    >
      {PASSWORD_RESET_SUCCESS_MESSAGE}
    </p>
  );
}

async function OAuthErrorNotice({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const value = Array.isArray(error) ? error[0] : error;
  const message = getOAuthErrorMessage(value);

  if (!message) {
    return null;
  }

  return (
    <p
      role="alert"
      className="w-full max-w-md rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Suspense fallback={null}>
        <ResetPasswordNotice searchParams={searchParams} />
        <OAuthErrorNotice searchParams={searchParams} />
      </Suspense>

      <LoginForm />
    </div>
  );
}
