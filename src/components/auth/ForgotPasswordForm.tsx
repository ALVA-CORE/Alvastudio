import { Link } from "react-router-dom";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BeamInput } from "@/components/auth/BeamInput";
import { TextureButton } from "@/components/ui/texture-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Asks an admin for help getting back into an account.
 *
 * Not a self-serve reset. An admin approves the request and the API emails
 * the link, so what this screen can honestly promise is that somebody will
 * look at it.
 *
 * **The same thing is shown whatever the email was.** The API answers
 * identically for an address it has never seen, and saying "we found you" or
 * "no such account" here would turn this form into a way to find out who has
 * an account on Alvastudio.
 */
export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setError(null);

    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (cause) {
      /* A rate limit is the one refusal worth repeating: it is about what
         they just did, not about whether the account exists. */
      setError(
        cause instanceof ApiError ? cause.message : "Could not send that request."
      );
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Request sent</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            An admin has been notified. You will get a link to set a new
            password shortly.
          </p>
        </div>

        <Link
          to="/login"
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          An admin reviews the request, then emails you a link
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

          {error ? (
            <p role="alert" className="text-center text-xs font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <TextureButton
            type="submit"
            variant="alva"
            size="lg"
            className="mt-2"
            loading={form.formState.isSubmitting}
          >
            Send reset link
          </TextureButton>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
