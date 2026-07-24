import { Fragment } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type StepperBarsProps = {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  disableStepIndicators?: boolean;
  size?: "sm" | "md";
  className?: string;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: "tween", ease: "easeOut", duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function StepIndicator({
  step,
  currentStep,
  onClickStep,
  disableStepIndicators = false,
  size = "md",
}: {
  step: number;
  currentStep: number;
  onClickStep: (step: number) => void;
  disableStepIndicators?: boolean;
  size?: "sm" | "md";
}) {
  const status =
    currentStep === step ? "active" : currentStep < step ? "inactive" : "complete";
  const isSmall = size === "sm";

  return (
    <button
      type="button"
      onClick={() => {
        if (step !== currentStep && !disableStepIndicators) onClickStep(step);
      }}
      disabled={disableStepIndicators}
      className={cn(
        "relative outline-none focus-visible:ring-2 focus-visible:ring-alva-accent/40",
        disableStepIndicators ? "pointer-events-none" : "cursor-pointer"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold transition-colors",
          isSmall ? "size-6" : "size-8",
          status === "inactive" && "bg-alva-surface text-muted-foreground",
          status === "active" && "bg-alva-accent text-alva-bg",
          status === "complete" && "bg-alva-accent text-alva-bg"
        )}
      >
        {status === "complete" ? (
          <CheckIcon className={cn("text-alva-bg", isSmall ? "size-2.5" : "size-4")} />
        ) : status === "active" ? (
          <div className={cn("rounded-full bg-alva-bg", isSmall ? "size-2" : "size-3")} />
        ) : (
          <span className={isSmall ? "text-[10px]" : "text-sm"}>{step}</span>
        )}
      </div>
    </button>
  );
}

function StepConnector({
  isComplete,
  size = "md",
}: {
  isComplete: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "relative h-0.5 flex-1 overflow-hidden rounded bg-alva-border",
        size === "sm" ? "mx-1" : "mx-2"
      )}
    >
      <motion.div
        className="absolute left-0 top-0 h-full bg-alva-accent"
        initial={false}
        animate={{ width: isComplete ? "100%" : "0%" }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

export function StepperBars({
  currentStep,
  totalSteps,
  onStepClick,
  disableStepIndicators = false,
  size = "md",
  className,
}: StepperBarsProps) {
  return (
    <div className={cn("flex w-full items-center", className)}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isNotLastStep = index < totalSteps - 1;

        return (
          <Fragment key={stepNumber}>
            <StepIndicator
              step={stepNumber}
              currentStep={currentStep}
              disableStepIndicators={disableStepIndicators}
              size={size}
              onClickStep={(step) => onStepClick?.(step)}
            />
            {isNotLastStep && (
              <StepConnector isComplete={currentStep > stepNumber} size={size} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
