import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Smartphone from "@solar-icons/react/devices/Smartphone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BeamInput } from "@/components/auth/BeamInput";
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";
import { StepperBars } from "@/components/interns/participants/StepperBars";
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
import {
  CONTRIBUTOR_ONBOARDING_STEPS,
  FLUENCY_OPTIONS,
  PREFERRED_VARIETY_OPTIONS,
  RECORDING_DEVICE_OPTIONS,
} from "@/data/contributors/onboarding";
import {
  AGE_BRACKET_OPTIONS,
  GENDER_OPTIONS,
} from "@/data/interns/participants";
import { useAuth } from "@/lib/auth/context";
import {
  detectMicrophoneLabel,
  detectRecordingEnvironment,
  suggestRecordingDevice,
} from "@/lib/device-detection";
import { normalizePhoneDigits } from "@/lib/participant-validation";
import {
  CONTRIBUTOR_STEP_FIELDS,
  contributorOnboardingSchema,
  type ContributorOnboardingValues,
} from "@/lib/validations/contributor-onboarding";
import type { ContributorProfileData } from "@/lib/validations/auth";

const TOTAL_STEPS = CONTRIBUTOR_ONBOARDING_STEPS.length;
const AUTH_FIELD_SIZE = "lg" as const;

export function ContributorOnboardingForm() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [step, setStep] = useState(1);
  const [detectingMic, setDetectingMic] = useState(false);

  const form = useForm<ContributorOnboardingValues>({
    resolver: zodResolver(contributorOnboardingSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      ageBracket: undefined,
      gender: undefined,
      stateOfOrigin: "",
      ethnicity: "",
      occupation: "",
      nativeLanguages: "",
      pidginFluency: undefined,
      englishFluency: undefined,
      homeLanguages: "",
      preferredVariety: undefined,
      recordingDevice: undefined,
      detectedDeviceLabel: "",
      detectedMicLabel: "",
      confirmAge18: false,
      consentRecording: false,
      consentNdpa: false,
    },
    mode: "onTouched",
  });

  useEffect(() => {
    if (step !== 4) return;

    const detected = detectRecordingEnvironment();
    form.setValue("detectedDeviceLabel", detected.deviceLabel, { shouldDirty: false });

    if (!form.getValues("recordingDevice")) {
      form.setValue("recordingDevice", suggestRecordingDevice(detected.platform), {
        shouldDirty: false,
      });
    }
  }, [form, step]);

  const handleDetectMic = async () => {
    setDetectingMic(true);
    const micLabel = await detectMicrophoneLabel();
    form.setValue("detectedMicLabel", micLabel ?? "No microphone detected", {
      shouldDirty: false,
    });
    setDetectingMic(false);
  };

  const handleNext = async () => {
    const fields = CONTRIBUTOR_STEP_FIELDS[step];
    const valid = await form.trigger(fields, { shouldFocus: true });
    if (!valid) return;

    if (step < TOTAL_STEPS) {
      setStep((current) => current + 1);
      return;
    }

    const values = form.getValues();
    const contributorProfile: ContributorProfileData = {
      ageBracket: values.ageBracket,
      gender: values.gender,
      stateOfOrigin: values.stateOfOrigin,
      ethnicity: values.ethnicity,
      occupation: values.occupation || undefined,
      nativeLanguages: values.nativeLanguages,
      pidginFluency: values.pidginFluency,
      englishFluency: values.englishFluency,
      homeLanguages: values.homeLanguages,
      preferredVariety: values.preferredVariety as ContributorProfileData["preferredVariety"],
      recordingDevice: values.recordingDevice as ContributorProfileData["recordingDevice"],
      detectedDeviceLabel: values.detectedDeviceLabel || undefined,
      detectedMicLabel: values.detectedMicLabel || undefined,
    };

    signup({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      password: values.password,
      role: "contributor",
      contributorProfile,
    });
    navigate("/contributor/dashboard");
  };

  const handleBack = () => {
    if (step > 1) setStep((current) => current - 1);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Join as a contributor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about yourself so we can match you with the right prompts
        </p>
      </div>

      <StepperBars
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        disableStepIndicators
        size="sm"
      />

      <Form {...form}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleNext();
          }}
          className="space-y-2.5"
        >
          {step === 1 && (
            <>
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <BeamInput
                        label="Phone number"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={11}
                        {...field}
                        onChange={(event) =>
                          field.onChange(normalizePhoneDigits(event.target.value))
                        }
                      />
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
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <FormField
                  control={form.control}
                  name="ageBracket"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <AlvaSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Age bracket"
                          options={AGE_BRACKET_OPTIONS}
                          hasError={Boolean(fieldState.error)}
                          size={AUTH_FIELD_SIZE}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <AlvaSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Gender"
                          options={GENDER_OPTIONS}
                          hasError={Boolean(fieldState.error)}
                          size={AUTH_FIELD_SIZE}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="stateOfOrigin"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormControl>
                      <StateCombobox
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="State of origin"
                        size={AUTH_FIELD_SIZE}
                        error={fieldState.error?.message}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ethnicity"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <BeamInput label="Ethnicity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <BeamInput label="Occupation / industry (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {step === 3 && (
            <>
              <FormField
                control={form.control}
                name="nativeLanguages"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <BeamInput label="Native language(s)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-2.5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pidginFluency"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <AlvaSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Nigerian Pidgin fluency"
                          options={FLUENCY_OPTIONS}
                          hasError={Boolean(fieldState.error)}
                          size={AUTH_FIELD_SIZE}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="englishFluency"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <AlvaSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Nigerian English fluency"
                          options={FLUENCY_OPTIONS}
                          hasError={Boolean(fieldState.error)}
                          size={AUTH_FIELD_SIZE}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="homeLanguages"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <BeamInput label="Languages spoken at home growing up" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredVariety"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormControl>
                      <AlvaSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Preferred recording variety"
                        options={[...PREFERRED_VARIETY_OPTIONS]}
                        hasError={Boolean(fieldState.error)}
                        size={AUTH_FIELD_SIZE}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {step === 4 && (
            <>
              <div className="rounded-2xl bg-alva-surface p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-alva-card">
                    <Smartphone size={18} weight="Outline" className="text-alva-accent" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">Auto-detected device</p>
                    <p className="text-sm text-muted-foreground">
                      {form.watch("detectedDeviceLabel") || "Detecting…"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3 border-t border-alva-border pt-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-alva-card">
                    <Microphone3 size={18} weight="Outline" className="text-alva-accent" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium text-foreground">Microphone</p>
                    <p className="text-sm text-muted-foreground">
                      {form.watch("detectedMicLabel") ||
                        "Grant mic access to detect your default input"}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleDetectMic()}
                      disabled={detectingMic}
                      className="text-sm font-medium text-alva-accent transition-colors hover:text-alva-accent/80 disabled:opacity-60"
                    >
                      {detectingMic ? "Detecting…" : "Detect microphone"}
                    </button>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="recordingDevice"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormControl>
                      <AlvaSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Device / mic you will use"
                        options={[...RECORDING_DEVICE_OPTIONS]}
                        hasError={Boolean(fieldState.error)}
                        size={AUTH_FIELD_SIZE}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="confirmAge18"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-2 rounded-2xl bg-alva-surface p-4">
                      <FormControl>
                        <AuthCheckbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-snug">
                        <FormLabel className="cursor-pointer text-sm font-normal text-foreground">
                          I confirm that I am 18 years or older
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consentRecording"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-2 rounded-2xl bg-alva-surface p-4">
                      <FormControl>
                        <AuthCheckbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-snug">
                        <FormLabel className="cursor-pointer text-sm font-normal text-foreground">
                          I consent to my voice being recorded and used for speech research
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consentNdpa"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-2 rounded-2xl bg-alva-surface p-4">
                      <FormControl>
                        <AuthCheckbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-snug">
                        <FormLabel className="cursor-pointer text-sm font-normal text-foreground">
                          I acknowledge Alva&apos;s NDPA-compliant data-use policy
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            {step > 1 && (
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <AltArrowLeft size={14} weight="Outline" />
                  Previous
                </button>
                <div className="h-4 w-px bg-alva-border" />
              </>
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-alva-accent"
              >
                Next
                <AltArrowRight size={14} weight="Outline" />
              </button>
            ) : (
              <TextureButton type="submit" variant="alva" size="default" className="w-auto">
                Create contributor account
              </TextureButton>
            )}
          </div>
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
