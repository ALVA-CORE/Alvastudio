import Logout from "@solar-icons/react/arrows-action/Logout";
import Bell from "@solar-icons/react/notifications/Bell";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import Translation2 from "@solar-icons/react/it/Translation2";
import UserId from "@solar-icons/react/users/UserId";
import { useNavigate } from "react-router-dom";
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
            sheetDescription="Your annotator account on Alva Studio."
          >
            <div className="space-y-3">
              <ProfileInfoBlock label="Full name" value={user?.fullName ?? "Not set"} />
              <ProfileInfoBlock label="Email" value={user?.email ?? "Not set"} />
              <ProfileInfoBlock label="Phone" value={user?.phone ?? "Not set"} />
              <ProfileInfoBlock label="Role" value="Annotator" />
            </div>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Translation2 size={20} weight="Outline" />}
            title="Language clearance"
            sheetTitle="Language clearance"
            sheetDescription="The varieties you are cleared to tag."
          >
            <div className="space-y-3">
              <ProfileInfoBlock
                label="Cleared varieties"
                value={profile?.varieties ?? "Nigerian English, Nigerian Pidgin"}
              />
              <ProfileInfoBlock
                label="Session scope"
                value={profile?.scope ?? "All focus group sessions"}
              />
            </div>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Clipboard size={20} weight="Outline" />}
            title="Annotation scope"
            sheetTitle="Annotation scope"
            sheetDescription="What lands in your queue and how it is graded."
          >
            <div className="space-y-3">
              <ProfileInfoBlock label="Queue" value="Focus group sessions" />
              <ProfileInfoBlock label="Mode" value="Multi-speaker conversational" />
              <ProfileInfoBlock
                label="Agreement target"
                value={agreementLabel(profile?.agreementTarget)}
              />
              <ProfileInfoBlock label="Second-pass review" value="Every 5th session" />
            </div>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<ShieldCheck size={20} weight="Outline" />}
            title="Handling & privacy"
            sheetTitle="Handling & privacy"
            sheetDescription="How participant audio may be handled during annotation."
          >
            <div className="space-y-3">
              <ProfileInfoBlock label="NDPA training" value="Completed" />
              <ProfileInfoBlock label="Audio export" value="Disabled" />
              <ProfileInfoBlock
                label="Participant identifiers"
                value="Masked in the workspace"
              />
            </div>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Bell size={20} weight="Outline" />}
            title="Notifications"
            sheetTitle="Notifications"
            sheetDescription="Alerts for queue depth and agreement drift."
          >
            <div className="space-y-3">
              <ProfileInfoBlock
                label="Queue alerts"
                value={profile?.queueAlerts === false ? "Off" : "On"}
              />
              <ProfileInfoBlock
                label="Agreement alerts"
                value={profile?.agreementAlerts === false ? "Off" : "On"}
              />
            </div>
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
