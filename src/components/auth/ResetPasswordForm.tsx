import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ShieldKeyhole from "@solar-icons/react/security/ShieldKeyhole";
import { BeamInput } from "@/components/auth/BeamInput";
import { TextureButton } from "@/components/ui/texture-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { redeemPasswordReset } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { alvaToast } from "@/lib/alva-toast";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetValues = z.infer<typeof resetSchema>;

/**
 * Reads the token out of the URL and takes it off the URL.
 *
 * The API puts it in the **fragment**, `#token=...`, which is the right
 * place: a fragment is never sent to a server, so the token cannot end up
 * in an access log, a referrer header or a proxy's history. A `?token=`
 * query would be in all three.
 *
 * A query is still read as a fallback, because a mail client that rewrites
 * links for click tracking sometimes moves it, and somebody locked out of
 * their account is the worst person to hand a dead link to.
 *
 * It is then wiped from the address bar with `replaceState`. It stays in
 * React state for the one request that spends it, and nowhere else: not in
 * the URL somebody screenshots, not in the back button, not in storage.
 */
function useResetToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fromHash = new URLSearchParams(
      window.location.hash.replace(/^#/, "")
    ).get("token");
    const fromQuery = new URLSearchParams(window.location.search).get("token");
    const found = fromHash ?? fromQuery;

    if (!found) return;
    setToken(found);

    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return token;
}

/**
 * Sets a new password from an emailed link.
 *
 * The other half of the recovery flow. `POST /users/{id}/password-reset` and
 * the self-serve request both mint a token and email a link to this page;
 * until now that link landed on a 404, which made the whole feature a dead
 * end at the last step.
 *
 * The token is spent, not checked first. There is no endpoint to ask "is
 * this still good", and adding a probe would mean two round trips to learn
 * what the one that matters already answers. A dead token comes back 4xx
 * with the API's own sentence, which is shown as sent.
 *
 * Success sends them to sign in rather than signing them in. The API
 * returns no session from a redeem, and inventing one by posting the new
 * password to login would mean this page held a working credential for
 * longer than the moment it needed it.
 */
export function ResetPasswordForm() {
  const navigate = useNavigate();
  const token = useResetToken();
  const [checked, setChecked] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* One tick after mount, so "no token" is a conclusion rather than the
     state before the effect has run. Without it the page flashes the dead
     link message at everybody. */
  useEffect(() => setChecked(true), []);

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetValues) => {
    if (!token) return;
    setFormError(null);

    try {
      await redeemPasswordReset({ token, new_password: values.password });
    } catch (cause) {
      /* Shown as sent. The API distinguishes expired, already used and
         never valid, and all three are things this person needs to know
         rather than a single "that did not work". */
      setFormError(
        cause instanceof ApiError
          ? cause.message
          : "Could not set that password. Try the link again."
      );
      return;
    }

    /* Cleared before leaving, so a password does not sit in a form state
       that an extension or a back navigation could reach. */
    form.reset();
    alvaToast.success("Password changed, sign in with it now");
    navigate("/login", { replace: true });
  };

  if (checked && !token) {
    return (
      <div className="space-y-6 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-alva-surface">
          <ShieldKeyhole size={26} weight="BoldDuotone" className="text-amber-300" />
        </span>

        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            This link is incomplete
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            It has no reset code in it. Some mail apps cut long links in half,
            so try opening it again from the email, or ask for a new one.
          </p>
        </div>

        <Link
          to="/forgot-password"
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          Send me another link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This link works once
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <BeamInput
                    label="New password"
                    showPasswordToggle
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <BeamInput
                    label="Confirm new password"
                    showPasswordToggle
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {formError ? (
            <p role="alert" className="text-center text-xs font-medium text-destructive">
              {formError}
            </p>
          ) : null}

          <TextureButton
            type="submit"
            variant="alva"
            size="lg"
            className="mt-2"
            loading={form.formState.isSubmitting}
            disabled={!token}
          >
            Set password
          </TextureButton>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
