import { Link, useNavigate } from "react-router-dom";
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

  const onSubmit = (values: InternSignupValues) => {
    signup({
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="primaryState"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Primary state</FormLabel>
                  <FormControl>
                    <StateCombobox
                      value={field.value}
                      onChange={field.onChange}
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
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Quota alerts</FormLabel>
                  <FormControl>
                    <AlvaSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="How often"
                      options={[...QUOTA_ALERT_OPTIONS]}
                      hasError={Boolean(fieldState.error)}
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

          <TextureButton type="submit" variant="alva" size="lg" className="mt-2">
            Create intern account
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
