import { Suspense } from "react";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { passwordResetTokenSchema } from "@/lib/validations/reset-password";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

function ResetPasswordFallback() {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-sm text-muted-foreground"
    >
      Checking your reset link...
    </p>
  );
}

async function ResetPasswordContent({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;
  const parsedToken = passwordResetTokenSchema.safeParse(token);

  if (!parsedToken.success) {
    return (
      <Card className="w-full max-w-md border-border/60 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Invalid reset link
          </CardTitle>

          <CardDescription>
            This password reset link is missing or malformed.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Request a new reset link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <ResetPasswordForm token={parsedToken.data} />;
}

export default function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  return (
    <div className="flex w-full justify-center">
      <Suspense fallback={<ResetPasswordFallback />}>
        <ResetPasswordContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
