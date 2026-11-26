import { useEffect, useState } from "react";
import Key from "@solar-icons/react/security/Key";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { RecoveryCodesList } from "@/components/admin/users/RecoveryCodesList";
import { TextureButton } from "@/components/ui/texture-button";
import { makeRecoveryCodes, recoveryCodesLeft } from "@/lib/api/auth";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";

/** Few enough to make a new set. */
const LOW = 3;

/**
 * An admin's own recovery codes (25 Nov), for signing in when the emailed
 * code doesn't arrive. How many are left, and a new set on request.
 */
export function RecoveryCodesRow() {
  const [left, setLeft] = useState<number | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [isMaking, setMaking] = useState(false);

  useEffect(() => {
    recoveryCodesLeft()
      .then((status) => setLeft(status.remaining))
      .catch(() => setLeft(null));
  }, []);

  const make = async () => {
    setMaking(true);
    try {
      const made = await makeRecoveryCodes();
      setCodes(made.codes);
      setLeft(made.codes.length);
    } catch (cause) {
      const message = reportApiError(cause, "Could not make new codes.");
      if (message) alvaToast.error(message);
    } finally {
      setMaking(false);
    }
  };

  return (
    <ProfileActionRow
      icon={<Key size={20} weight="Outline" />}
      title="Recovery codes"
      value={
        left === null ? null : (
          <span className={left <= LOW ? "text-xs text-amber-300" : "text-xs text-muted-foreground"}>
            {left} left
          </span>
        )
      }
      sheetTitle="Recovery codes"
    >
      {codes ? (
        <RecoveryCodesList codes={codes} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            If the sign-in code doesn't reach your email, one of these gets you in.{" "}
            {left === 0
              ? "You have none, so make a set now."
              : left !== null && left <= LOW
                ? `Only ${left} left: make a new set.`
                : null}
          </p>
          {left ? <p className="text-xs text-muted-foreground">A new set replaces the codes you have now.</p> : null}
          <TextureButton variant="alva" size="sm" className="w-full" loading={isMaking} onClick={() => void make()}>
            Make new codes
          </TextureButton>
        </div>
      )}
    </ProfileActionRow>
  );
}
