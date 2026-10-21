"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { LoginInput, loginSchema } from "@/lib/validations/login";
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

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)


  const delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    try {
      await delay(2000);
      console.log(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: ""
    }
  })

  return (
    <Card className="w-full max-w-md border-border/60 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Welcome back
        </CardTitle>

        <CardDescription>
          Log in using your username or email.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate id="login-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-5">
            {/* Username / Email */}
            <Field data-invalid={!!form.formState.errors.identifier}>
              <FieldLabel htmlFor="login-form-identifier">
                Username or Email
              </FieldLabel>

              <Input
                id="login-form-identifier"
                {...form.register("identifier")}
                type="text"
                aria-invalid={!!form.formState.errors.identifier}
                placeholder="johndoe or you@example.com"
                autoComplete="username"
                className="h-10"
              />

              {form.formState.errors.identifier && (
                <FieldError
                  errors={[form.formState.errors.identifier]}
                />
              )}
            </Field>

            {/* Password */}
            <Field data-invalid={!!form.formState.errors.password}>
              <FieldLabel htmlFor="login-form-password">
                Password
              </FieldLabel>

              <div className="relative">
                <Input
                  id="login-form-password"
                  {...form.register("password")}
                  type={showPassword ? "text" : "password"}
                  aria-invalid={!!form.formState.errors.password}
                  placeholder="Enter your password"
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
          form="login-form"
          disabled={isLoading}
          className="h-10 w-full"
        >
          {isLoading ? "Logging you in..." : "Log in"}
        </Button>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>Don't have an account?</span>

          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
