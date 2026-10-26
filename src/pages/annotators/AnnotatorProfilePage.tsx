import Logout from "@solar-icons/react/arrows-action/Logout";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import Translation2 from "@solar-icons/react/it/Translation2";
import UserId from "@solar-icons/react/users/UserId";
import { useNavigate } from "react-router-dom";
import { PrivacyRows } from "@/components/annotators/profile/PrivacyRows";
import { AnnotatorMobileGate } from "@/components/annotators/layout/AnnotatorMobileGate";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AppVersionFooter } from "@/components/profile/AppVersionFooter";
import { ChangePasswordRow } from "@/components/profile/ChangePasswordRow";
import { FeedbackRow } from "@/components/profile/FeedbackRow";
import { PrivacyAlertsRow } from "@/components/profile/PrivacyAlertsRow";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileInfoBlock } from "@/components/profile/ProfileInfoBlock";
import { AlvaTopGlow } from "@/components/shared/AlvaTopGlow";
import { TextureButton } from "@/components/ui/texture-button";
import { AGREEMENT_TARGET_OPTIONS } from "@/lib/validations/auth";
import { useAuth } from "@/lib/auth/context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAnnotatorProfile } from "@/hooks/useAnnotatorProfile";
import { NO_VALUE } from "@/lib/no-value";

function agreementLabel(value?: string) {
  return (
    AGREEMENT_TARGET_OPTIONS.find((option) => option.value === value)?.label ??
    "85% agreement"
  );
}

export default function AnnotatorProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const firstName = user?.fullName?.split(" ")[0] ?? "User";
  const profile = user?.annotatorProfile;
  const { clearance, isLoading: loadingClearance } = useAnnotatorProfile();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (isMobile) {
    return <AnnotatorMobileGate />;
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <AlvaTopGlow intensity="soft" />
      <DesktopPageShell>
        <ProfileHero
          name={user?.fullName ?? "Alva Annotator"}
          phone={user?.phone}
          seed={user?.email ?? firstName}
        />

        <section className="mt-8 [&_.alva-row]:py-2.5">
          <ProfileActionRow
            icon={<UserId size={20} weight="Outline" />}
            title="Account details"
            sheetTitle="Account details"
          >
            <dl>
              <ProfileInfoBlock label="Full name" value={user?.fullName ?? "Not set"} />
              <ProfileInfoBlock label="Email" value={user?.email ?? "Not set"} />
              <ProfileInfoBlock label="Phone" value={user?.phone ?? "Not set"} />
              <ProfileInfoBlock label="Role" value="Annotator" />
            </dl>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Translation2 size={20} weight="Outline" />}
            title="Language clearance"
            sheetTitle="Language clearance"
          >
            {/* Both rows come from `/onboarding/annotator-profile`. They used
                to be fixed strings that happened to match the common case. */}
            <dl>
              <ProfileInfoBlock
                label="Cleared varieties"
                value={
                  loadingClearance
                    ? NO_VALUE
                    : clearance?.varieties || "Not set"
                }
              />
              <ProfileInfoBlock
                label="Session scope"
                value={loadingClearance ? NO_VALUE : clearance?.scope || "Not set"}
              />
            </dl>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Clipboard size={20} weight="Outline" />}
            title="Annotation scope"
            sheetTitle="Annotation scope"
          >
            <dl>
              <ProfileInfoBlock label="Queue" value="Focus group sessions" />
              <ProfileInfoBlock label="Mode" value="Multi-speaker conversational" />
              <ProfileInfoBlock
                label="Agreement target"
                value={agreementLabel(profile?.agreementTarget)}
              />
            </dl>
          </ProfileActionRow>

          <PrivacyAlertsRow
            alerts={[
              "A session assigned to you, and work waiting in your queue",
              "An annotation of yours approved, sent back or rejected",
            ]}
          >
            <dl className="mt-4">
              <PrivacyRows />
            </dl>

            {/* Facts about the build, not settings on this account, so they
                are written as sentences with nothing to toggle beside them. */}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Audio cannot be exported from the workspace, and participant
              names are masked everywhere a session is annotated.
            </p>
          </PrivacyAlertsRow>

          <FeedbackRow />

          <ChangePasswordRow hideDivider />

          <div className="mt-6 flex justify-center">
            <TextureButton
              variant="destructive"
              size="sm"
              className="w-auto"
              onClick={handleLogout}
            >
              <span className="flex items-center justify-center gap-2">
                <Logout size={16} weight="Outline" />
                Sign out
              </span>
            </TextureButton>
          </div>

          <AppVersionFooter />
        </section>
      </DesktopPageShell>
    </div>
  );
}
