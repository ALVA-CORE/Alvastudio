import { useState } from "react";
import {
  AGE_BRACKET_OPTIONS,
  CONSENT_OPTIONS,
  EMPTY_PARTICIPANT_DRAFT,
  SESSION_LANGUAGE_OPTIONS,
  type ParticipantDraft,
  type ParticipantRecord,
} from "@/data/interns/participants";
import { saveParticipant } from "@/lib/intern-participants";
import { StepperBars } from "@/components/interns/participants/StepperBars";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Identity", description: "Name or ID and contact" },
  { title: "Demographics", description: "Quota-relevant profile fields" },
  { title: "Session", description: "Language and consent for this session" },
  { title: "Domain", description: "Occupation or sector relevance" },
] as const;

type ParticipantIntakeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (participant: ParticipantRecord) => void;
};

function fieldClass(hasError: boolean) {
  return cn(
    "h-10 border-0 bg-alva-surface text-foreground",
    hasError && "ring-1 ring-destructive"
  );
}

export function ParticipantIntakeModal({
  open,
  onOpenChange,
  onSaved,
}: ParticipantIntakeModalProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ParticipantDraft>(EMPTY_PARTICIPANT_DRAFT);
  const [errors, setErrors] = useState<string[]>([]);

  const reset = () => {
    setStep(1);
    setDraft(EMPTY_PARTICIPANT_DRAFT);
    setErrors([]);
  };

  const patch = (patch: Partial<ParticipantDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setErrors([]);
  };

  const validateStep = (current: number) => {
    const nextErrors: string[] = [];
    if (current === 1) {
      if (!draft.nameOrId.trim()) nextErrors.push("Name or participant ID is required.");
      if (!draft.phone.trim()) nextErrors.push("Phone number is required.");
    }
    if (current === 2) {
      if (!draft.ageBracket) nextErrors.push("Age bracket is required.");
      if (!draft.gender.trim()) nextErrors.push("Gender is required.");
      if (!draft.state.trim()) nextErrors.push("State is required.");
      if (!draft.nativeLanguage.trim()) nextErrors.push("Native language is required.");
    }
    if (current === 3) {
      if (!draft.sessionLanguage) nextErrors.push("Session language is required.");
      if (!draft.consent) nextErrors.push("Consent confirmation is required.");
    }
    if (current === 4) {
      if (!draft.occupation.trim()) nextErrors.push("Occupation or sector is required.");
    }
    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < STEPS.length) {
      setStep((prev) => prev + 1);
      return;
    }

    const record: ParticipantRecord = {
      ...draft,
      id: crypto.randomUUID(),
      loggedAt: Date.now(),
    };
    saveParticipant(record);
    onSaved?.(record);
    onOpenChange(false);
    reset();
  };

  const handleBack = () => {
    if (step > 1) setStep((prev) => prev - 1);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg rounded-2xl border-alva-border bg-alva-card p-0">
        <DialogHeader className="space-y-3 px-6 pt-6">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Log session participant
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Capture participant details before recording a focus group session.
          </DialogDescription>
          <StepperBars
            currentStep={step}
            totalSteps={STEPS.length}
            onStepClick={(next) => {
              if (next < step) setStep(next);
            }}
            className="pt-1"
          />
          <div>
            <p className="text-sm font-medium text-foreground">{STEPS[step - 1].title}</p>
            <p className="text-xs text-muted-foreground">{STEPS[step - 1].description}</p>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-2 pt-2">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nameOrId">Name or participant ID</Label>
                <Input
                  id="nameOrId"
                  value={draft.nameOrId}
                  onChange={(e) => patch({ nameOrId: e.target.value })}
                  placeholder="e.g. Participant A-14"
                  className={fieldClass(errors.some((e) => e.includes("Name")))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  value={draft.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  placeholder="+234 800 000 0000"
                  className={fieldClass(errors.some((e) => e.includes("Phone")))}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Age bracket</Label>
                <Select
                  value={draft.ageBracket || undefined}
                  onValueChange={(value) =>
                    patch({ ageBracket: value as ParticipantDraft["ageBracket"] })
                  }
                >
                  <SelectTrigger className={fieldClass(errors.some((e) => e.includes("Age")))}>
                    <SelectValue placeholder="Select age bracket" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_BRACKET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Input
                  id="gender"
                  value={draft.gender}
                  onChange={(e) => patch({ gender: e.target.value })}
                  placeholder="e.g. Female"
                  className={fieldClass(errors.some((e) => e.includes("Gender")))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State of origin or residence</Label>
                <Input
                  id="state"
                  value={draft.state}
                  onChange={(e) => patch({ state: e.target.value })}
                  placeholder="e.g. Lagos"
                  className={fieldClass(errors.some((e) => e.includes("State")))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nativeLanguage">Native language</Label>
                <Input
                  id="nativeLanguage"
                  value={draft.nativeLanguage}
                  onChange={(e) => patch({ nativeLanguage: e.target.value })}
                  placeholder="e.g. Yoruba"
                  className={fieldClass(errors.some((e) => e.includes("Native")))}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Language used during session</Label>
                <Select
                  value={draft.sessionLanguage || undefined}
                  onValueChange={(value) =>
                    patch({ sessionLanguage: value as ParticipantDraft["sessionLanguage"] })
                  }
                >
                  <SelectTrigger
                    className={fieldClass(errors.some((e) => e.includes("Session language")))}
                  >
                    <SelectValue placeholder="English, Pidgin, or mixed" />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Consent confirmation</Label>
                <Select
                  value={draft.consent || undefined}
                  onValueChange={(value) =>
                    patch({ consent: value as ParticipantDraft["consent"] })
                  }
                >
                  <SelectTrigger
                    className={fieldClass(errors.some((e) => e.includes("Consent")))}
                  >
                    <SelectValue placeholder="Verbal or signed consent" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation / sector</Label>
              <Input
                id="occupation"
                value={draft.occupation}
                onChange={(e) => patch({ occupation: e.target.value })}
                placeholder="e.g. Healthcare, retail, transport"
                className={fieldClass(errors.some((e) => e.includes("Occupation")))}
              />
            </div>
          )}

          {errors.length > 0 && (
            <ul className="space-y-1 text-xs text-destructive">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between px-6 pb-6 pt-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Previous
            </button>
          ) : (
            <span />
          )}
          <TextureButton variant="alva" size="default" className="w-auto" onClick={handleNext}>
            {step === STEPS.length ? "Save participant" : "Next"}
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
