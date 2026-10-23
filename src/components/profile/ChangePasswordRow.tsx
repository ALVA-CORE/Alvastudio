import { useState } from "react";
import LockPassword from "@solar-icons/react/security/LockPassword";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { BeamInput } from "@/components/auth/BeamInput";
import { TextureButton } from "@/components/ui/texture-button";
import { changePassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { alvaToast } from "@/lib/alva-toast";
import { useAuth } from "@/lib/auth/context";
import { useNavigate } from "react-router-dom";

const MIN_LENGTH = 8;

/**
 * Change your own password, on every role's profile.
 *
 * Nobody could until now: the only routes were an admin issuing a reset token
 * and somebody redeeming one, so changing a password meant asking an admin,
 * which is both a support ticket and a reason for admins to be near other
 * people's credentials.
 *
 * The current password is asked for even though the session already proves who
 * they are. A signed-in tab somebody walked away from is the case this stops,
 * and it is the convention everywhere else for the same reason.
 *
 * Changing it ends every session the account has, this tab included, so a
 * success goes straight to the sign-in page. Waiting for a 401 on whatever
 * they tapped next would look like being thrown out for no reason.
 */
export function ChangePasswordRow({ hideDivider }: { hideDivider?: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready =
    current.length > 0 && next.length >= MIN_LENGTH && confirm === next;

  const submit = async () => {
    setError(null);
    setSaving(true);

    try {
      await changePassword({ current_password: current, new_password: next });

      /* The token that made this request is already dead. Clear the session
         ourselves and go to sign-in, so the next thing they tap is a login
         form rather than a 401. */
      alvaToast.success("Password changed. Sign in with your new one.");
      logout();
      navigate("/login");
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not change your password."
      );
      setSaving(false);
    }
  };

  return (
    <ProfileActionRow
      icon={<LockPassword size={20} weight="Outline" />}
      title="Change password"
      sheetTitle="Change password"
      sheetDescription="You will stay signed in here. Other devices are signed out."
      hideDivider={hideDivider}
    >
      <div className="space-y-2.5">
        <BeamInput
          label="Current password"
          showPasswordToggle
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />

        <BeamInput
          label="New password"
          showPasswordToggle
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
        />

        <BeamInput
          label="Confirm new password"
          showPasswordToggle
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />

        {/* Said as they type rather than on submit: both of these are known
            before the request, and a round trip to be told the two boxes
            differ is a round trip for nothing. */}
        {tooShort ? (
          <p className="text-xs text-muted-foreground">
            At least {MIN_LENGTH} characters.
          </p>
        ) : null}
        {mismatch ? (
          <p className="text-xs text-destructive">Those two do not match.</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <TextureButton
          variant="alva"
          size="lg"
          className="mt-1"
          disabled={!ready}
          loading={saving}
          onClick={() => void submit()}
        >
          Change password
        </TextureButton>
      </div>
    </ProfileActionRow>
  );
}
