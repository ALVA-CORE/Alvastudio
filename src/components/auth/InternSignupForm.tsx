import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BeamInput } from "@/components/auth/BeamInput";
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";
import { StateCombobox } from "@/components/interns/participants/StateCombobox";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
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
import { normalizePhoneDigits } from "@/lib/participant-validation";
import {
  QUOTA_ALERT_OPTIONS,
  internSignupSchema,
  type InternSignupValues,
} from "@/lib/validations/auth";

export function InternSignupForm() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const form = useForm<InternSignupValues>({
    resolver: zodResolver(internSignupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      primaryState: "",
      coverage: "",
      quotaAlerts: "weekly",
      acceptTerms: false,
    },
  });

  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (values: InternSignupValues) => {
    setFormError(null);

    try {
      await signup({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        role: "intern",
        internProfile: {
          primaryState: values.primaryState,
          coverage: values.coverage,
          quotaAlerts: values.quotaAlerts,
          sessionReminders: true,
          reviewUpdates: true,
          device: "desktop-mic",
        },
      });
    } catch (error) {
      // Most often "email already registered", which the API returns as a 4xx
      // with a usable message.
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not reach the server. Check your connection and try again."
      );
      return;
    }

    navigate("/intern/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Create intern account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your profile for focus group collection and review
        </p>
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
            name="coverage"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <BeamInput label="Coverage area" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-2.5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="primaryState"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm text-muted-foreground">Primary state</FormLabel>
                  <FormControl>
                    <StateCombobox
                      value={field.value}
                      onChange={field.onChange}
                      size="lg"
                      error={fieldState.error?.message}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quotaAlerts"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm text-muted-foreground">Quota alerts</FormLabel>
                  <FormControl>
                    <AlvaSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="How often"
                      options={[...QUOTA_ALERT_OPTIONS]}
                      hasError={Boolean(fieldState.error)}
                      size="lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                      I agree to the terms and conditions and NDPA data-use policy
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
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Creating account…" : "Create intern account"}
          </TextureButton>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
