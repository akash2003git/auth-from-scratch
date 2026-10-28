"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/reset-password";
import { PASSWORD_RESET_SERVER_ERROR_MESSAGE } from "@/lib/auth/messages";
import { resetPassword } from "@/app/actions/reset-password";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ResetPasswordInput) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await resetPassword({
        token: data.token,
        password: data.password,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      router.replace("/login?reset=success");
    } catch (cause) {
      console.error("Password reset failed", cause);
      setError(PASSWORD_RESET_SERVER_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/60 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Reset password
        </CardTitle>

        <CardDescription>
          Choose a new password for your account.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          noValidate
          id="reset-password-form"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <input type="hidden" {...form.register("token")} />

          <FieldGroup className="gap-5">
            <Field data-invalid={!!form.formState.errors.password}>
              <FieldLabel htmlFor="reset-password-form-password">
                New password
              </FieldLabel>

              <div className="relative">
                <Input
                  id="reset-password-form-password"
                  {...form.register("password")}
                  type={showPassword ? "text" : "password"}
                  aria-invalid={!!form.formState.errors.password}
                  placeholder="Enter a strong password"
                  autoComplete="new-password"
                  className="h-10 pr-10"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:bg-transparent hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {form.formState.errors.password && (
                <FieldError errors={[form.formState.errors.password]} />
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.confirmPassword}>
              <FieldLabel htmlFor="reset-password-form-confirm-password">
                Confirm new password
              </FieldLabel>

              <Input
                id="reset-password-form-confirm-password"
                {...form.register("confirmPassword")}
                type={showPassword ? "text" : "password"}
                aria-invalid={!!form.formState.errors.confirmPassword}
                placeholder="Repeat your new password"
                autoComplete="new-password"
                className="h-10"
              />

              {form.formState.errors.confirmPassword && (
                <FieldError
                  errors={[form.formState.errors.confirmPassword]}
                />
              )}
            </Field>
          </FieldGroup>

          {(error || form.formState.errors.token) && (
            <div
              role="alert"
              className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {form.formState.errors.token?.message ?? error}
            </div>
          )}
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 border-t bg-muted/20 px-6 py-4">
        <Button
          type="submit"
          form="reset-password-form"
          disabled={isLoading}
          className="h-10 w-full"
        >
          {isLoading ? "Resetting password..." : "Reset password"}
        </Button>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>Remembered your password?</span>

          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
