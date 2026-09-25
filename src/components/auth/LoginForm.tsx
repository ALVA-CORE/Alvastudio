import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BeamInput } from "@/components/auth/BeamInput";
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";
import { TextureButton } from "@/components/ui/texture-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/lib/auth/context";
import { ApiError } from "@/lib/api/client";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);

    try {
      await login(values.email, values.password);
    } catch (error) {
      // Only this form knows that a 401 here means bad credentials rather than
      // an expired session, so it supplies that wording itself.
      setFormError(
        error instanceof ApiError && error.status === 401
          ? "Your email or password is incorrect."
          : error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again."
      );
      return;
    }

    if (values.rememberMe) {
      localStorage.setItem("alva-remember-me", "true");
    } else {
      localStorage.removeItem("alva-remember-me");
    }

    // Only navigate once the session actually exists — otherwise the redirect
    // races the request and lands on a guard that bounces straight back.
    navigate("/");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to Alvastudio
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <BeamInput
                    label="Email"
                    type="email"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <BeamInput
                    label="Password"
                    showPasswordToggle
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-3">
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <AuthCheckbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer text-xs font-normal text-muted-foreground">
                    Remember me
                  </FormLabel>
                </FormItem>
              )}
            />

            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {formError ? (
            <p
              role="alert"
              className="text-center text-xs font-medium text-destructive"
            >
              {formError}
            </p>
          ) : null}

          <TextureButton
            type="submit"
            variant="alva"
            size="lg"
            className="mt-2"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </TextureButton>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        New contributor?{" "}
        <Link to="/contributor/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
