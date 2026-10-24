"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { SignupInput, signupSchema } from "@/lib/validations/signup";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: ""
    }
  })

  async function onSubmit(data: SignupInput) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signUp(data);

      if (!result.ok) {
        if (result.field) {
          form.setError(result.field, {
            type: "server",
            message: result.message,
          });
        } else {
          setError(result.message);
        }
        return;
      }

      router.replace("/dashboard");
    } catch (cause) {
      console.error("Signup request failed", cause);
      setError("We couldn't create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/60 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Welcome
        </CardTitle>

        <CardDescription>
          Create your account
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate id="signup-form" onSubmit={form.handleSubmit(onSubmit)}>
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <FieldGroup className="gap-5">
            {/* Username */}
            <Field data-invalid={!!form.formState.errors.username}>
              <FieldLabel htmlFor="signup-form-username">
                Username
              </FieldLabel>

              <Input
                id="signup-form-username"
                {...form.register("username")}
                type="text"
                aria-invalid={!!form.formState.errors.username}
                placeholder="johndoe"
                autoComplete="username"
                className="h-10"
              />

              {form.formState.errors.username && (
                <FieldError
                  errors={[form.formState.errors.username]}
                />
              )}
            </Field>

            {/* Email */}
            <Field data-invalid={!!form.formState.errors.email}>
              <FieldLabel htmlFor="signup-form-email">
                Email
              </FieldLabel>

              <Input
                id="signup-form-email"
                {...form.register("email")}
                type="email"
                aria-invalid={!!form.formState.errors.email}
                placeholder="johndoe@mail.com"
                autoComplete="email"
                className="h-10"
              />

              {form.formState.errors.email && (
                <FieldError
                  errors={[form.formState.errors.email]}
                />
              )}
            </Field>

            {/* Password */}
            <Field data-invalid={!!form.formState.errors.password}>
              <FieldLabel htmlFor="signup-form-password">
                Password
              </FieldLabel>

              <div className="relative">
                <Input
                  id="signup-form-password"
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(prev => !prev)}
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
                <FieldError
                  errors={[form.formState.errors.password]}
                />
              )}
            </Field>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 border-t bg-muted/20 px-6 py-4">
        <Button
          type="submit"
          form="signup-form"
          disabled={isLoading}
          className="h-10 w-full"
        >
          {isLoading ? "Signing you up..." : "Sign up"}
        </Button>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>Already have an account?</span>

          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
