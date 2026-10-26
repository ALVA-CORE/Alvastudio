import Logout from "@solar-icons/react/arrows-action/Logout";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import MapPointWave from "@solar-icons/react/map/MapPointWave";
import UserId from "@solar-icons/react/users/UserId";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";
import { INTERN_DEVICE_OPTIONS } from "@/lib/validations/auth";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AlvaTopGlow } from "@/components/shared/AlvaTopGlow";
import { AppVersionFooter } from "@/components/profile/AppVersionFooter";
import { ChangePasswordRow } from "@/components/profile/ChangePasswordRow";
import { FeedbackRow } from "@/components/profile/FeedbackRow";
import { PrivacyAlertsRow } from "@/components/profile/PrivacyAlertsRow";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileInfoBlock } from "@/components/profile/ProfileInfoBlock";
import { TextureButton } from "@/components/ui/texture-button";

function deviceLabel(value?: string) {
  return INTERN_DEVICE_OPTIONS.find((option) => option.value === value)?.label ?? "Not set";
}

export default function InternProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.fullName?.split(" ")[0] ?? "User";
  const profile = user?.internProfile;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="relative min-h-full overflow-hidden">
      <AlvaTopGlow intensity="soft" />
      <DesktopPageShell>
        <ProfileHero
          name={user?.fullName ?? "Alva Intern"}
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
            </dl>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<MapPointWave size={20} weight="Outline" />}
            title="Assigned region"
            sheetTitle="Assigned region"
          >
            <dl>
              <ProfileInfoBlock
                label="Primary state"
                value={profile?.primaryState ?? "Not set"}
              />
              <ProfileInfoBlock label="Coverage" value={profile?.coverage ?? "Not set"} />
            </dl>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Microphone3 size={20} weight="Outline" />}
            title="Recording defaults"
            sheetTitle="Recording defaults"
          >
            <dl>
              <ProfileInfoBlock label="Mode" value="Focus group" />
              <ProfileInfoBlock label="Max participants per session" value="3" />
              <ProfileInfoBlock label="Device" value={deviceLabel(profile?.device)} />
            </dl>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Clipboard size={20} weight="Outline" />}
            title="Review scope"
            sheetTitle="Review scope"
          >
            <dl>
              <ProfileInfoBlock label="Modes" value="Prompt reader, Stimuli" />
              <ProfileInfoBlock label="Queue access" value="Contributor submissions" />
            </dl>
          </ProfileActionRow>

          <PrivacyAlertsRow
            alerts={[
              "A clip you reviewed changed hands, and new work in your queue",
              "Quota and session reminders for your region",
            ]}
          >
            {/* Participant consent is recorded against the participant, not
                against this account, so it is read in the session rather than
                here. Said plainly because an intern is the one collecting it. */}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Consent you record for a participant lives on that session, not
              here. A session with no consent on file cannot be annotated, and
              you can redact a participant from one at any time.
            </p>
          </PrivacyAlertsRow>

          <FeedbackRow />

          <ChangePasswordRow hideDivider />

          <div className="mt-6 flex justify-center">
            <TextureButton variant="destructive" size="sm" className="w-auto" onClick={handleLogout}>
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
