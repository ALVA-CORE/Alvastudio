import { useState } from "react";
import { BeamInput } from "@/components/auth/BeamInput";
import { TextureButton } from "@/components/ui/texture-button";
import { useAuth } from "@/lib/auth/context";
import { resendSignInCode, type SignInChallenge } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { signInErrorMessage } from "@/lib/api/signInError";
import { alvaToast } from "@/lib/alva-toast";

/**
 * An admin's second sign-in step (25 Nov): the six-digit code emailed to
 * them, or one of their recovery codes when the email doesn't come.
 */
export function SignInCodeStep({
  challenge: first,
  remember,
  onDone,
  onStartOver,
}: {
  challenge: SignInChallenge;
  remember: boolean;
  onDone: () => void;
  /** Back to the password form, with why: expired, used, or out of tries. */
  onStartOver: (reason: string) => void;
}) {
  const { verifyCode } = useAuth();
  const [challenge, setChallenge] = useState(first);
  /* With no email sent, a recovery code is the only way in. */
  const [recovery, setRecovery] = useState(!first.email_sent);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setSending] = useState(false);

  const failed = (cause: unknown) => {
    if (cause instanceof ApiError && cause.code === "challenge_expired") return onStartOver(cause.message);
    if (cause instanceof ApiError && cause.status === 409) return onStartOver(cause.message);
    if (cause instanceof ApiError && cause.code === "code_invalid" && cause.attemptsLeft !== null) {
      return setError(`${cause.message} ${cause.attemptsLeft} ${cause.attemptsLeft === 1 ? "try" : "tries"} left.`);
    }
    if (cause instanceof ApiError && cause.status === 429 && cause.retryAfterSeconds) {
      return setError(`Too many tries. Wait ${cause.retryAfterSeconds} seconds.`);
    }
    setError(signInErrorMessage(cause));
  };

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      await verifyCode(
        challenge.challenge_id,
        recovery ? { recovery_code: value.trim() } : { code: value.trim() },
        remember
      );
      onDone();
    } catch (cause) {
      failed(cause);
    } finally {
      setSending(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      setChallenge(await resendSignInCode(challenge.challenge_id));
      alvaToast.success("Code sent again");
    } catch (cause) {
      failed(cause);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {recovery ? "Use a recovery code" : "Check your email"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {recovery
            ? challenge.email_sent
              ? "Each one works once."
              : "We couldn't email a code just now. Use one of your recovery codes."
            : `We sent a 6-digit code to ${challenge.email_hint}.`}
        </p>
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <BeamInput
          key={recovery ? "recovery" : "code"}
          label={recovery ? "Recovery code" : "6-digit code"}
          autoFocus
          inputMode={recovery ? "text" : "numeric"}
          autoComplete={recovery ? "off" : "one-time-code"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />

        {error ? (
          <p role="alert" className="text-center text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <TextureButton type="submit" variant="alva" size="lg" className="mt-2" loading={isSending} disabled={!value.trim()}>
          Sign in
        </TextureButton>
      </form>

      <div className="flex flex-col items-center gap-2 text-xs">
        {challenge.email_sent ? (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              setRecovery((current) => !current);
              setValue("");
              setError(null);
            }}
          >
            {recovery ? "Use the emailed code instead" : "Use a recovery code instead"}
          </button>
        ) : null}
        {!recovery && challenge.email_sent && challenge.resends_left > 0 ? (
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => void resend()}>
            Send the code again
          </button>
        ) : null}
      </div>
    </div>
  );
}
