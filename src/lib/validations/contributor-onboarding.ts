import { z } from "zod";
import { isValidNigerianPhone } from "@/lib/participant-validation";
import {
  FLUENCY_LEVELS,
} from "@/data/contributors/onboarding";

const ageBracketValues = ["18-24", "25-34", "35-44", "45-54", "55+"] as const;
const genderValues = ["male", "female", "prefer-not-to-say"] as const;

export const contributorIdentityStepSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    phone: z
      .string()
      .min(11, "Enter an 11-digit Nigerian number")
      .refine(isValidNigerianPhone, "Enter a valid 11-digit Nigerian number"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const contributorDemographicsStepSchema = z
  .object({
    dateOfBirth: z.string().optional(),
    ageBracket: z.enum(ageBracketValues).or(z.literal("")).optional(),
    gender: z.enum(genderValues, { message: "Select your gender" }),
    stateOfOrigin: z.string().min(1, "Select your state of origin"),
    currentResidence: z.string().min(2, "Enter your current state or city"),
    ethnicity: z.string().min(2, "Enter your ethnicity"),
    occupation: z.string().optional(),
  })
  .refine((data) => Boolean(data.dateOfBirth?.trim() || data.ageBracket), {
    message: "Enter your date of birth or select an age bracket",
    path: ["ageBracket"],
  });

export const contributorLanguageStepSchema = z.object({
  nativeLanguages: z.string().min(2, "List at least one native language"),
  pidginFluency: z.enum(FLUENCY_LEVELS, { message: "Select Pidgin fluency" }),
  englishFluency: z.enum(FLUENCY_LEVELS, { message: "Select English fluency" }),
  homeLanguages: z.string().min(2, "Describe the languages spoken at home"),
  preferredVariety: z.enum(["english", "pidgin", "both"], {
    message: "Select your preferred recording variety",
  }),
});

export const contributorRecordingStepSchema = z.object({
  recordingDevice: z.enum(
    ["mobile", "desktop-builtin", "desktop-external", "tablet", "other"],
    {
      message: "Select the device you will record with",
    }
  ),
  detectedDeviceLabel: z.string().optional(),
  detectedMicLabel: z.string().optional(),
});

export const contributorConsentStepSchema = z.object({
  confirmAge18: z.boolean().refine((value) => value === true, {
    message: "You must confirm you are 18 or older",
  }),
  consentRecording: z.boolean().refine((value) => value === true, {
    message: "Recording consent is required to contribute",
  }),
  consentNdpa: z.boolean().refine((value) => value === true, {
    message: "NDPA acknowledgment is required",
  }),
});

export const contributorOnboardingSchema = contributorIdentityStepSchema
  .and(contributorDemographicsStepSchema)
  .and(contributorLanguageStepSchema)
  .and(contributorRecordingStepSchema)
  .and(contributorConsentStepSchema);

export type ContributorOnboardingValues = z.infer<typeof contributorOnboardingSchema>;

export const CONTRIBUTOR_STEP_FIELDS: Record<number, (keyof ContributorOnboardingValues)[]> = {
  1: ["fullName", "phone", "email", "password", "confirmPassword"],
  2: [
    "dateOfBirth",
    "ageBracket",
    "gender",
    "stateOfOrigin",
    "currentResidence",
    "ethnicity",
    "occupation",
  ],
  3: [
    "nativeLanguages",
    "pidginFluency",
    "englishFluency",
    "homeLanguages",
    "preferredVariety",
  ],
  4: ["recordingDevice", "detectedDeviceLabel", "detectedMicLabel"],
  5: ["confirmAge18", "consentRecording", "consentNdpa"],
};

export const CONTRIBUTOR_STEP_SCHEMAS = {
  1: contributorIdentityStepSchema,
  2: contributorDemographicsStepSchema,
  3: contributorLanguageStepSchema,
  4: contributorRecordingStepSchema,
  5: contributorConsentStepSchema,
} as const;
