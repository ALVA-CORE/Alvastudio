import Logout from "@solar-icons/react/arrows-action/Logout";
import Bell from "@solar-icons/react/notifications/Bell";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import Translation2 from "@solar-icons/react/it/Translation2";
import UserId from "@solar-icons/react/users/UserId";
import { useNavigate } from "react-router-dom";
import { PrivacyRows } from "@/components/annotators/profile/PrivacyRows";
import { AnnotatorMobileGate } from "@/components/annotators/layout/AnnotatorMobileGate";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
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
            sheetDescription="Your annotator account on Alvastudio."
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
            sheetDescription="The varieties you are cleared to tag."
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
            sheetDescription="What lands in your queue and how it is graded."
          >
            <dl>
              <ProfileInfoBlock label="Queue" value="Focus group sessions" />
              <ProfileInfoBlock label="Mode" value="Multi-speaker conversational" />
              <ProfileInfoBlock
                label="Agreement target"
                value={agreementLabel(profile?.agreementTarget)}
              />
              <ProfileInfoBlock label="Second-pass review" value="Every 5th session" />
            </dl>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<ShieldCheck size={20} weight="Outline" />}
            title="Handling & privacy"
            sheetTitle="Handling & privacy"
            sheetDescription="How participant audio may be handled during annotation, and what is recorded about your own work."
          >
            <dl>
              <PrivacyRows />
            </dl>

            {/* Facts about the build, not settings on this account, so they
                are written as sentences with nothing to toggle beside them. */}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Audio cannot be exported from the workspace, and participant
              names are masked everywhere a session is annotated.
            </p>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Bell size={20} weight="Outline" />}
            title="Notifications"
            sheetTitle="Notifications"
            sheetDescription="Alerts for queue depth and agreement drift."
          >
            <dl>
              <ProfileInfoBlock
                label="Queue alerts"
                value={profile?.queueAlerts === false ? "Off" : "On"}
              />
              <ProfileInfoBlock
                label="Agreement alerts"
                value={profile?.agreementAlerts === false ? "Off" : "On"}
              />
            </dl>
          </ProfileActionRow>

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
        </section>
      </DesktopPageShell>
    </div>
  );
}
