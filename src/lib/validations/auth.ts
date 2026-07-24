import { z } from "zod";
import { isValidNigerianPhone } from "@/lib/participant-validation";
import type {
  FluencyLevel,
  PreferredVariety,
  RecordingDevice,
} from "@/data/contributors/onboarding";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

export const signupSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().min(11, "Enter a valid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const internSignupSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    phone: z
      .string()
      .min(11, "Enter an 11-digit Nigerian number")
      .refine(isValidNigerianPhone, "Enter a valid 11-digit Nigerian number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    primaryState: z.string().min(1, "Select your primary state"),
    coverage: z.string().min(2, "Describe your coverage area"),
    quotaAlerts: z.enum(["weekly", "daily", "off"]),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type InternSignupValues = z.infer<typeof internSignupSchema>;

export type UserRole = "contributor" | "intern" | "admin";

export type InternProfileData = {
  primaryState: string;
  coverage: string;
  quotaAlerts: "weekly" | "daily" | "off";
  sessionReminders?: boolean;
  reviewUpdates?: boolean;
  device?: "mobile" | "desktop-mic" | "both";
};

export type ContributorProfileData = {
  dateOfBirth?: string;
  ageBracket?: string;
  gender: "male" | "female" | "prefer-not-to-say";
  stateOfOrigin: string;
  currentResidence: string;
  ethnicity: string;
  occupation?: string;
  nativeLanguages: string;
  pidginFluency: FluencyLevel;
  englishFluency: FluencyLevel;
  homeLanguages: string;
  preferredVariety: PreferredVariety;
  recordingDevice: RecordingDevice;
  detectedDeviceLabel?: string;
  detectedMicLabel?: string;
};

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  onboardingComplete?: boolean;
  internProfile?: InternProfileData;
  contributorProfile?: ContributorProfileData;
};

export const QUOTA_ALERT_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "off", label: "Off" },
] as const;

export const INTERN_DEVICE_OPTIONS = [
  { value: "mobile", label: "Mobile phone" },
  { value: "desktop-mic", label: "Desktop + field mic" },
  { value: "both", label: "Both" },
] as const;
