import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BeamInput } from "@/components/auth/BeamInput";
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";
import { ConsentLinks } from "@/components/auth/ConsentLinks";
import { AlvaMultiSelect } from "@/components/shared/AlvaMultiSelect";
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
import { useFormDraft } from "@/hooks/useFormDraft";
import {
  SignInBlockedSheet,
  signInBlock,
  type SignInBlock,
} from "@/components/auth/SignInBlockedSheet";
import { signInErrorMessage } from "@/lib/api/signInError";
import { alvaToast } from "@/lib/alva-toast";
import { normalizePhoneDigits } from "@/lib/participant-validation";
import {
  ANNOTATOR_VARIETY_OPTIONS,
  annotatorSignupSchema,
  type AnnotatorSignupValues,
} from "@/lib/validations/auth";

/**
 * Annotators apply for an account, the same way interns do.
 *
 * They were invited by an admin until now, which is why there was no page for
 * this. The two fields past the account itself are the annotator profile:
 * which varieties they can tag, and which sessions they can cover. Both are
 * claims at sign-up rather than facts, which is the whole reason the account
 * waits for an admin before it works.
 */
export function AnnotatorSignupForm() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const form = useForm<AnnotatorSignupValues>({
    resolver: zodResolver(annotatorSignupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      varieties: [],
      scope: "",
      acceptTerms: false,
    },
  });

  /* Survives a refresh. Passwords are never written out. */
  const draft = useFormDraft(form, {
    key: "alva-annotator-signup-draft",
    exclude: ["password", "confirmPassword"],
  });

  const [formError, setFormError] = useState<string | null>(null);

  const [blocked, setBlocked] = useState<SignInBlock | null>(null);


  const onSubmit = async (values: AnnotatorSignupValues) => {
    setFormError(null);

    try {
      await signup({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        role: "annotator",
        annotatorProfile: {
          varieties: values.varieties
            .map(
              (value) =>
                ANNOTATOR_VARIETY_OPTIONS.find((option) => option.value === value)
                  ?.label ?? value
            )
            .join(", "),
          scope: values.scope,
          agreementTarget: "85",
          queueAlerts: true,
          agreementAlerts: true,
        },
        annotatorClearance: {
          language_varieties: values.varieties,
          sessions_covered: values.scope
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
        },
      });
    } catch (error) {
      /* A full platform is not about them: nothing on the form can be
         changed to get past it, so it opens a sheet rather than a line
         under a field that invites another try. */
      const block = signInBlock(error);
      if (block) {
        setBlocked(block);
        return;
      }

      // Most often "email already registered", which the API returns as a 4xx
      // with a usable message.
      setFormError(signInErrorMessage(error));
      return;
    }

    /* Back to sign-in, not into the workspace. The account exists but is not
     * approved, and sending someone straight to a queue they cannot read
     * would make a wall of permission errors their first impression. */
    draft.clear();
    alvaToast.success("Account created, an admin needs to approve it");
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Create annotator account
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <BeamInput label="Full name" autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <BeamInput label="Email" type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <BeamInput
                    label="Phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={11}
                    {...field}
                    onChange={(e) => field.onChange(normalizePhoneDigits(e.target.value))}
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
                    label="Confirm password"
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
            name="varieties"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-sm text-muted-foreground">
                  Varieties you can tag
                </FormLabel>
                <FormControl>
                  <AlvaMultiSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={[...ANNOTATOR_VARIETY_OPTIONS]}
                    placeholder="Pick at least one"
                    summary={(selected) =>
                      selected.length === ANNOTATOR_VARIETY_OPTIONS.length
                        ? "Both varieties"
                        : `${selected.length} selected`
                    }
                    aria-label="Varieties you can tag"
                  />
                </FormControl>
                {fieldState.error ? <FormMessage /> : null}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scope"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <BeamInput label="Sessions you can cover" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-start gap-2">
                  <FormControl>
                    <AuthCheckbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-snug">
                    <FormLabel className="cursor-pointer text-xs font-normal text-muted-foreground">
                      <ConsentLinks />
                    </FormLabel>
                    <FormMessage />
                  </div>
                </div>
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
          >
            Create annotator account
          </TextureButton>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>

      {/* Not an inline error. A full platform is nothing the form can fix,
          and a line under a field invites another go at it. */}
      <SignInBlockedSheet
        block={blocked}
        onOpenChange={(open) => {
          if (!open) setBlocked(null);
        }}
      />
    </div>
  );
}
