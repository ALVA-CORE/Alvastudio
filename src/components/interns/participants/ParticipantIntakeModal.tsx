import { useMemo, useState } from "react";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import {
  EMPTY_PARTICIPANT_DRAFT,
  PARTICIPANT_COUNT_OPTIONS,
  type ParticipantDraft,
  type ParticipantRecord,
} from "@/data/interns/participants";
import { createSessionId, saveParticipantsBatch } from "@/lib/intern-participants";
import {
  normalizePhoneDigits,
  validateParticipantDraft,
  type ParticipantFieldErrors,
} from "@/lib/participant-validation";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import { StepperBars } from "@/components/interns/participants/StepperBars";
import { StateCombobox } from "@/components/interns/participants/StateCombobox";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextureButton } from "@/components/ui/texture-button";
import {
  AGE_BRACKET_OPTIONS,
  CONSENT_OPTIONS,
  GENDER_OPTIONS,
  SESSION_LANGUAGE_OPTIONS,
} from "@/data/interns/participants";
import { cn } from "@/lib/utils";

type ParticipantIntakeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusGroupSession: string;
  onComplete?: (participants: ParticipantRecord[]) => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export function ParticipantIntakeModal({
  open,
  onOpenChange,
  focusGroupSession,
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

    const sessionId = createSessionId();
    const records: ParticipantRecord[] = drafts.map((draft) => ({
      ...draft,
      id: crypto.randomUUID(),
      sessionId,
      focusGroupSession,
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
      <DialogContent
        className="max-w-lg rounded-3xl border-alva-border bg-alva-card p-0"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("[data-radix-popper-content-wrapper]")) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("[data-radix-popper-content-wrapper]")) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="space-y-4 px-6 pt-6">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Log session participants
          </DialogTitle>
          <StepperBars
            currentStep={step}
            totalSteps={totalSteps}
            size="sm"
            onStepClick={(next) => {
              if (next < step) setStep(next);
            }}
          />
        </DialogHeader>

        <div className="space-y-4 px-6 pb-2 pt-1">
          {isCountStep ? (
            <div className="space-y-3">
              <Label>How many participants are in this session?</Label>
              <div className="grid grid-cols-3 gap-2">
                {PARTICIPANT_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleCountSelect(count)}
                    className={cn(
                      "rounded-full py-3 text-sm font-medium transition-colors",
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
                    <Input
                      id="nameOrId"
                      value={currentDraft.nameOrId}
                      onChange={(e) =>
                        patchDraft(participantIndex, { nameOrId: e.target.value })
                      }
                      placeholder="Name or participant ID"
                      className={alvaFieldClass(Boolean(fieldErrors.nameOrId))}
                    />
                    <FieldError message={fieldErrors.nameOrId} />
                  </div>

                  <div className="space-y-2">
                    <Input
                      id="phone"
                      inputMode="numeric"
                      value={currentDraft.phone}
                      onChange={(e) =>
                        patchDraft(participantIndex, {
                          phone: normalizePhoneDigits(e.target.value),
                        })
                      }
                      placeholder="Phone number"
                      maxLength={11}
                      className={alvaFieldClass(Boolean(fieldErrors.phone))}
                    />
                    <FieldError message={fieldErrors.phone} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <AlvaSelect
                      value={currentDraft.ageBracket || undefined}
                      onValueChange={(value) =>
                        patchDraft(participantIndex, {
                          ageBracket: value as ParticipantDraft["ageBracket"],
                        })
                      }
                      placeholder="Age bracket"
                      options={AGE_BRACKET_OPTIONS}
                      hasError={Boolean(fieldErrors.ageBracket)}
                    />
                    <FieldError message={fieldErrors.ageBracket} />
                  </div>

                  <div className="space-y-2">
                    <AlvaSelect
                      value={currentDraft.gender || undefined}
                      onValueChange={(value) =>
                        patchDraft(participantIndex, {
                          gender: value as ParticipantDraft["gender"],
                        })
                      }
                      placeholder="Gender"
                      options={GENDER_OPTIONS}
                      hasError={Boolean(fieldErrors.gender)}
                    />
                    <FieldError message={fieldErrors.gender} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <StateCombobox
                      value={currentDraft.state}
                      onChange={(value) => patchDraft(participantIndex, { state: value })}
                      placeholder="State of origin or residence"
                      error={fieldErrors.state}
                    />
                  </div>

                  <div className="space-y-2">
                    <Input
                      id="nativeLanguage"
                      value={currentDraft.nativeLanguage}
                      onChange={(e) =>
                        patchDraft(participantIndex, { nativeLanguage: e.target.value })
                      }
                      placeholder="Native language"
                      className={alvaFieldClass(Boolean(fieldErrors.nativeLanguage))}
                    />
                    <FieldError message={fieldErrors.nativeLanguage} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <AlvaSelect
                      value={currentDraft.sessionLanguage || undefined}
                      onValueChange={(value) =>
                        patchDraft(participantIndex, {
                          sessionLanguage: value as ParticipantDraft["sessionLanguage"],
                        })
                      }
                      placeholder="Session language"
                      options={SESSION_LANGUAGE_OPTIONS}
                      hasError={Boolean(fieldErrors.sessionLanguage)}
                    />
                    <FieldError message={fieldErrors.sessionLanguage} />
                  </div>

                  <div className="space-y-2">
                    <AlvaSelect
                      value={currentDraft.consent || undefined}
                      onValueChange={(value) =>
                        patchDraft(participantIndex, {
                          consent: value as ParticipantDraft["consent"],
                        })
                      }
                      placeholder="Consent"
                      options={CONSENT_OPTIONS}
                      hasError={Boolean(fieldErrors.consent)}
                    />
                    <FieldError message={fieldErrors.consent} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    id="occupation"
                    value={currentDraft.occupation}
                    onChange={(e) =>
                      patchDraft(participantIndex, { occupation: e.target.value })
                    }
                    placeholder="Occupation / sector"
                    className={alvaFieldClass(Boolean(fieldErrors.occupation))}
                  />
                  <FieldError message={fieldErrors.occupation} />
                </div>
              </>
            )
          )}
        </div>

        <div className="flex items-center justify-center gap-3 px-6 pb-6 pt-4">
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
          {!isLastStep ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-alva-accent"
            >
              Next
              <AltArrowRight size={14} weight="Outline" />
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
