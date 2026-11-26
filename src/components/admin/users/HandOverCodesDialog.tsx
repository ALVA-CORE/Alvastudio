import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { RecoveryCodesList } from "@/components/admin/users/RecoveryCodesList";
import { makeRecoveryCodesFor } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";

/**
 * Recovery codes for another admin who lost their email and their codes
 * (25 Nov), to hand over in person or by phone. Their old codes stop working,
 * and they are emailed that it happened.
 */
export function HandOverCodesDialog({
  open,
  onOpenChange,
  userId,
  fullName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  fullName: string;
}) {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMaking, setMaking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCodes(null);
    setError(null);
  }, [open]);

  const make = async () => {
    setMaking(true);
    setError(null);
    try {
      setCodes((await makeRecoveryCodesFor(userId)).codes);
    } catch (cause) {
      setError(reportApiError(cause, "Could not make the codes."));
    } finally {
      setMaking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="border-alva-border bg-alva-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg text-foreground">Recovery codes for {fullName}</DialogTitle>
        </DialogHeader>
        {codes ? (
          <RecoveryCodesList codes={codes} />
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              For when they can't get the emailed sign-in code and have no codes left. Their old codes stop
              working, and they get an email saying you did this. Hand the new ones over in person or by phone.
            </p>
            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <TextureButton variant="minimal" size="sm" className="w-auto" onClick={() => onOpenChange(false)}>
                Cancel
              </TextureButton>
              <TextureButton variant="alva" size="sm" className="w-auto" loading={isMaking} onClick={() => void make()}>
                Make codes
              </TextureButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
