import type { ParticipantRecord } from "@/data/interns/participants";
import {
  formatConsentLabel,
  formatGenderLabel,
  formatSessionLanguageLabel,
} from "@/data/interns/participants";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProfileInfoBlock } from "@/components/profile/ProfileInfoBlock";
import { PanelDivider, PanelSection } from "@/components/shared/PanelPrimitives";

type ParticipantDetailSheetProps = {
  participant: ParticipantRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PanelSection title={title}>
      {/* No filled box around the rows. The sheet is already a panel, so a
          surface inside it stacks surface on surface — and the box was drawing
          a border around four single words. */}
      <dl>{children}</dl>
    </PanelSection>
  );
}

export function ParticipantDetailSheet({
  participant,
  open,
  onOpenChange,
}: ParticipantDetailSheetProps) {
  if (!participant) return null;

  const loggedAt = new Date(participant.loggedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-alva-border bg-alva-card p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-alva-border bg-alva-card px-6 pb-4 pt-6 text-left">
          <SheetTitle className="text-xl text-foreground">{participant.nameOrId}</SheetTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {participant.focusGroupSession}
          </p>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <DetailSection title="Identity">
            <ProfileInfoBlock label="Name or ID" value={participant.nameOrId} />
            <ProfileInfoBlock label="Phone" value={participant.phone} />
          </DetailSection>

          <PanelDivider className="-mx-6 my-0" />

          <DetailSection title="Demographics">
            <ProfileInfoBlock label="Age bracket" value={participant.ageBracket || "—"} />
            <ProfileInfoBlock label="Gender" value={formatGenderLabel(participant.gender) || "—"} />
            <ProfileInfoBlock label="State" value={participant.state || "—"} />
            <ProfileInfoBlock label="Native language" value={participant.nativeLanguage || "—"} />
          </DetailSection>

          <PanelDivider className="-mx-6 my-0" />

          <DetailSection title="Focus group">
            <ProfileInfoBlock label="Focus group session" value={participant.focusGroupSession} />
            <ProfileInfoBlock
              label="Language used"
              value={formatSessionLanguageLabel(participant.sessionLanguage) || "—"}
            />
            <ProfileInfoBlock
              label="Consent"
              value={formatConsentLabel(participant.consent) || "—"}
            />
            <ProfileInfoBlock label="Logged at" value={loggedAt} />
          </DetailSection>

          <PanelDivider className="-mx-6 my-0" />

          <DetailSection title="Domain">
            <ProfileInfoBlock label="Occupation / sector" value={participant.occupation || "—"} />
          </DetailSection>
        </div>
      </SheetContent>
    </Sheet>
  );
}
