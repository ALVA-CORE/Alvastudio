import Logout from "@solar-icons/react/arrows-action/Logout";
import Bell from "@solar-icons/react/notifications/Bell";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import MapPointWave from "@solar-icons/react/map/MapPointWave";
import UserId from "@solar-icons/react/users/UserId";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";
import {
  INTERN_DEVICE_OPTIONS,
  QUOTA_ALERT_OPTIONS,
} from "@/lib/validations/auth";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AlvaTopGlow } from "@/components/shared/AlvaTopGlow";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileInfoBlock } from "@/components/profile/ProfileInfoBlock";
import { TextureButton } from "@/components/ui/texture-button";

function deviceLabel(value?: string) {
  return INTERN_DEVICE_OPTIONS.find((option) => option.value === value)?.label ?? "Not set";
}

function quotaLabel(value?: string) {
  return QUOTA_ALERT_OPTIONS.find((option) => option.value === value)?.label ?? "Not set";
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
            sheetDescription="Your intern account on Alva Studio."
          >
            <div className="space-y-3">
              <ProfileInfoBlock label="Full name" value={user?.fullName ?? "Not set"} />
              <ProfileInfoBlock label="Email" value={user?.email ?? "Not set"} />
              <ProfileInfoBlock label="Phone" value={user?.phone ?? "Not set"} />
            </div>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<MapPointWave size={20} weight="Outline" />}
            title="Assigned region"
            sheetTitle="Assigned region"
            sheetDescription="Where you are collecting focus group sessions."
          >
            <div className="space-y-3">
              <ProfileInfoBlock
                label="Primary state"
                value={profile?.primaryState ?? "Not set"}
              />
              <ProfileInfoBlock label="Coverage" value={profile?.coverage ?? "Not set"} />
            </div>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Microphone3 size={20} weight="Outline" />}
            title="Recording defaults"
            sheetTitle="Recording defaults"
            sheetDescription="How your record sessions are configured."
          >
            <div className="space-y-3">
              <ProfileInfoBlock label="Mode" value="Focus group" />
              <ProfileInfoBlock label="Max participants per session" value="3" />
              <ProfileInfoBlock label="Device" value={deviceLabel(profile?.device)} />
            </div>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Clipboard size={20} weight="Outline" />}
            title="Review scope"
            sheetTitle="Review scope"
            sheetDescription="Contributor clips assigned to your review queue."
          >
            <div className="space-y-3">
              <ProfileInfoBlock label="Modes" value="Prompt reader, Stimuli" />
              <ProfileInfoBlock label="Queue access" value="Contributor submissions" />
            </div>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Bell size={20} weight="Outline" />}
            title="Notifications"
            sheetTitle="Notifications"
            sheetDescription="Alerts for sessions, reviews, and quota updates."
          >
            <div className="space-y-3">
              <ProfileInfoBlock
                label="Session reminders"
                value={profile?.sessionReminders ? "On" : "Off"}
              />
              <ProfileInfoBlock
                label="Review queue updates"
                value={profile?.reviewUpdates ? "On" : "Off"}
              />
              <ProfileInfoBlock label="Quota alerts" value={quotaLabel(profile?.quotaAlerts)} />
            </div>
          </ProfileActionRow>

          <div className="mt-6 flex justify-center">
            <TextureButton variant="destructive" size="sm" className="w-auto" onClick={handleLogout}>
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
