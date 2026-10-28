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
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/forgot-password";
import {
  PASSWORD_RESET_REQUEST_MESSAGE,
  PASSWORD_RESET_SERVER_ERROR_MESSAGE,
} from "@/lib/auth/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/reset-password";

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestPasswordReset(data);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setSuccessMessage(result.message ?? PASSWORD_RESET_REQUEST_MESSAGE);
    } catch (cause) {
      console.error("Password reset request failed", cause);
      setError(PASSWORD_RESET_SERVER_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/60 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Forgot password
        </CardTitle>

        <CardDescription>
          Enter your email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {successMessage ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-muted-foreground"
          >
            {successMessage}
          </p>
        ) : (
          <form
            noValidate
            id="forgot-password-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FieldGroup className="gap-5">
              <Field data-invalid={!!form.formState.errors.email}>
                <FieldLabel htmlFor="forgot-password-form-email">
                  Email
                </FieldLabel>

                <Input
                  id="forgot-password-form-email"
                  {...form.register("email")}
                  type="email"
                  aria-invalid={!!form.formState.errors.email}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-10"
                />

                {form.formState.errors.email && (
                  <FieldError errors={[form.formState.errors.email]} />
                )}
              </Field>
            </FieldGroup>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4 border-t bg-muted/20 px-6 py-4">
        {successMessage ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              setSuccessMessage(null);
            }}
            className="h-10 w-full"
          >
            Send another link
          </Button>
        ) : (
          <Button
            type="submit"
            form="forgot-password-form"
            disabled={isLoading}
            className="h-10 w-full"
          >
            {isLoading ? "Sending link..." : "Send reset link"}
          </Button>
        )}

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
