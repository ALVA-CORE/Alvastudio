import { useMemo, useState } from "react";
import {
  AGE_BRACKET_OPTIONS,
  CONSENT_OPTIONS,
  EMPTY_PARTICIPANT_DRAFT,
  GENDER_OPTIONS,
  PARTICIPANT_COUNT_OPTIONS,
  SESSION_LANGUAGE_OPTIONS,
  type ParticipantDraft,
  type ParticipantRecord,
} from "@/data/interns/participants";
import { saveParticipantsBatch } from "@/lib/intern-participants";
import {
  normalizePhoneDigits,
  validateParticipantDraft,
  type ParticipantFieldErrors,
} from "@/lib/participant-validation";
import { StepperBars } from "@/components/interns/participants/StepperBars";
import { StateCombobox } from "@/components/interns/participants/StateCombobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type ParticipantIntakeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (participants: ParticipantRecord[]) => void;
};

function fieldClass(hasError: boolean) {
  return cn(
    "h-10 border-0 bg-alva-surface text-foreground",
    hasError && "ring-1 ring-destructive"
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export function ParticipantIntakeModal({
  open,
  onOpenChange,
  onComplete,
}: ParticipantIntakeModalProps) {
  const [step, setStep] = useState(1);
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<ParticipantDraft[]>([]);
  const [countError, setCountError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<ParticipantFieldErrors>({});

  const totalSteps = participantCount ? 1 + participantCount : 1;
  const isCountStep = step === 1;
  const isLastStep = !isCountStep && step === totalSteps;
  const participantIndex = step - 2;
  const currentDraft = participantIndex >= 0 ? drafts[participantIndex] : null;

  const reset = () => {
    setStep(1);
    setParticipantCount(null);
    setDrafts([]);
    setCountError(undefined);
    setFieldErrors({});
  };

  const patchDraft = (index: number, patch: Partial<ParticipantDraft>) => {
    setDrafts((prev) =>
      prev.map((draft, i) => (i === index ? { ...draft, ...patch } : draft))
    );
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as (keyof ParticipantDraft)[]) {
        delete next[key];
      }
      return next;
    });
  };

  const handleCountSelect = (count: number) => {
    setParticipantCount(count);
    setDrafts(Array.from({ length: count }, () => ({ ...EMPTY_PARTICIPANT_DRAFT })));
    setCountError(undefined);
  };

  const handleNext = () => {
    if (isCountStep) {
      if (!participantCount) {
        setCountError("Select how many participants are in this session.");
        return;
      }
      setStep(2);
      return;
    }

    if (!currentDraft) return;

    const errors = validateParticipantDraft(currentDraft);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!isLastStep) {
      setStep((prev) => prev + 1);
      setFieldErrors({});
      return;
    }

    const records: ParticipantRecord[] = drafts.map((draft) => ({
      ...draft,
      id: crypto.randomUUID(),
      loggedAt: Date.now(),
    }));

    saveParticipantsBatch(records);
    onComplete?.(records);
    onOpenChange(false);
    reset();
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
      setFieldErrors({});
    }
  };

  const participantLabel = useMemo(() => {
    if (participantIndex < 0 || !participantCount) return "";
    return `Participant ${participantIndex + 1} of ${participantCount}`;
  }, [participantCount, participantIndex]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg rounded-3xl border-alva-border bg-alva-card p-0">
        <DialogHeader className="space-y-4 px-6 pt-6">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Log session participants
          </DialogTitle>
          <StepperBars
            currentStep={step}
            totalSteps={totalSteps}
            onStepClick={(next) => {
              if (next < step) setStep(next);
            }}
          />
        </DialogHeader>

        <div className="space-y-4 px-6 pb-2 pt-1">
          {isCountStep ? (
            <div className="space-y-3">
              <Label>How many participants are in this session?</Label>
              <div className="grid grid-cols-4 gap-2">
                {PARTICIPANT_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleCountSelect(count)}
                    className={cn(
                      "rounded-xl py-3 text-sm font-medium transition-colors",
                      participantCount === count
                        ? "bg-alva-accent text-alva-bg"
                        : "bg-alva-surface text-foreground hover:text-alva-accent"
                    )}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <FieldError message={countError} />
            </div>
          ) : (
            currentDraft && (
              <>
                <p className="text-sm font-medium text-foreground">{participantLabel}</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nameOrId">Name or participant ID</Label>
                    <Input
                      id="nameOrId"
                      value={currentDraft.nameOrId}
                      onChange={(e) =>
                        patchDraft(participantIndex, { nameOrId: e.target.value })
                      }
                      placeholder="Participant A-14"
                      className={fieldClass(Boolean(fieldErrors.nameOrId))}
                    />
                    <FieldError message={fieldErrors.nameOrId} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      inputMode="numeric"
                      value={currentDraft.phone}
                      onChange={(e) =>
                        patchDraft(participantIndex, {
                          phone: normalizePhoneDigits(e.target.value),
                        })
                      }
                      placeholder="08012345678"
                      maxLength={11}
                      className={fieldClass(Boolean(fieldErrors.phone))}
                    />
                    <FieldError message={fieldErrors.phone} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Age bracket</Label>
                    <Select
                      value={currentDraft.ageBracket || undefined}
                      onValueChange={(value) =>
                        patchDraft(participantIndex, {
                          ageBracket: value as ParticipantDraft["ageBracket"],
                        })
                      }
                    >
                      <SelectTrigger className={fieldClass(Boolean(fieldErrors.ageBracket))}>
                        <SelectValue placeholder="Select age" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_BRACKET_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={fieldErrors.ageBracket} />
                  </div>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={currentDraft.gender || undefined}
                      onValueChange={(value) =>
                        patchDraft(participantIndex, {
                          gender: value as ParticipantDraft["gender"],
                        })
                      }
                    >
                      <SelectTrigger className={fieldClass(Boolean(fieldErrors.gender))}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={fieldErrors.gender} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>State of origin or residence</Label>
                    <StateCombobox
                      value={currentDraft.state}
                      onChange={(value) => patchDraft(participantIndex, { state: value })}
                      error={fieldErrors.state}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nativeLanguage">Native language</Label>
                    <Input
                      id="nativeLanguage"
                      value={currentDraft.nativeLanguage}
                      onChange={(e) =>
                        patchDraft(participantIndex, { nativeLanguage: e.target.value })
                      }
                      placeholder="Yoruba"
                      className={fieldClass(Boolean(fieldErrors.nativeLanguage))}
                    />
                    <FieldError message={fieldErrors.nativeLanguage} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Session language</Label>
                    <Select
                      value={currentDraft.sessionLanguage || undefined}
                      onValueChange={(value) =>
                        patchDraft(participantIndex, {
                          sessionLanguage: value as ParticipantDraft["sessionLanguage"],
                        })
                      }
                    >
                      <SelectTrigger
                        className={fieldClass(Boolean(fieldErrors.sessionLanguage))}
                      >
                        <SelectValue placeholder="English, Pidgin, mixed" />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_LANGUAGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={fieldErrors.sessionLanguage} />
                  </div>

                  <div className="space-y-2">
                    <Label>Consent</Label>
                    <Select
                      value={currentDraft.consent || undefined}
                      onValueChange={(value) =>
                        patchDraft(participantIndex, {
                          consent: value as ParticipantDraft["consent"],
                        })
                      }
                    >
                      <SelectTrigger className={fieldClass(Boolean(fieldErrors.consent))}>
                        <SelectValue placeholder="Verbal or signed" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONSENT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={fieldErrors.consent} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation / sector</Label>
                  <Input
                    id="occupation"
                    value={currentDraft.occupation}
                    onChange={(e) =>
                      patchDraft(participantIndex, { occupation: e.target.value })
                    }
                    placeholder="Healthcare, retail, transport"
                    className={fieldClass(Boolean(fieldErrors.occupation))}
                  />
                  <FieldError message={fieldErrors.occupation} />
                </div>
              </>
            )
          )}
        </div>

        <div className="flex justify-center gap-4 px-6 pb-6 pt-4">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Previous
            </button>
          )}
          {!isLastStep ? (
            <button
              type="button"
              onClick={handleNext}
              className="text-sm font-medium text-foreground transition-colors hover:text-alva-accent"
            >
              Next
            </button>
          ) : (
            <TextureButton variant="alva" size="default" className="w-auto" onClick={handleNext}>
              Save participants
            </TextureButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
