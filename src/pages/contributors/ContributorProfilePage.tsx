import Logout from "@solar-icons/react/arrows-action/Logout";
import Smartphone from "@solar-icons/react/devices/Smartphone";
import Translation2 from "@solar-icons/react/it/Translation2";
import MapPointWave from "@solar-icons/react/map/MapPointWave";
import Bell from "@solar-icons/react/notifications/Bell";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import UserId from "@solar-icons/react/users/UserId";
import { useNavigate } from "react-router-dom";
import {
  formatFluencyLabel,
  formatPreferredVarietyLabel,
  formatRecordingDeviceLabel,
} from "@/data/contributors/onboarding";
import { formatGenderLabel } from "@/data/interns/participants";
import { useAuth } from "@/lib/auth/context";
import { isStaffRole } from "@/lib/auth/roles";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContributorDesktopGate } from "@/components/layout/ContributorDesktopGate";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AlvaTopGlow } from "@/components/shared/AlvaTopGlow";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileInfoBlock } from "@/components/profile/ProfileInfoBlock";
import { TextureButton } from "@/components/ui/texture-button";

export default function ContributorProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isStaff = isStaffRole(user?.role);
  const firstName = user?.fullName?.split(" ")[0] ?? "User";
  const profile = user?.contributorProfile;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!isStaff && !isMobile) {
    return <ContributorDesktopGate />;
  }

  const content = (
    <div className="relative">
      <ProfileHero
        name={user?.fullName ?? "Alva Contributor"}
        phone={user?.phone}
        seed={user?.email ?? firstName}
      />

      <section className="mt-8 [&_.alva-row]:py-2.5">
        <ProfileActionRow
          icon={<UserId size={20} weight="Outline" />}
          title="Account details"
          sheetTitle="Account details"
          sheetDescription="Your core identity for Alvastudio."
        >
          <dl>
            <ProfileInfoBlock label="Full name" value={user?.fullName ?? "Not set"} />
            <ProfileInfoBlock label="Email" value={user?.email ?? "Not set"} />
            <ProfileInfoBlock label="Phone" value={user?.phone ?? "Not set"} />
            <ProfileInfoBlock
              label="Role"
              value={user?.role ? `${user.role[0].toUpperCase()}${user.role.slice(1)}` : "Contributor"}
            />
            <ProfileInfoBlock label="Gender" value={formatGenderLabel(profile?.gender ?? "") || "Not set"} />
            <ProfileInfoBlock label="Age bracket" value={profile?.ageBracket ?? "Not set"} />
          </dl>
        </ProfileActionRow>

        <ProfileActionRow
          icon={<Translation2 size={20} weight="Outline" />}
          title="Language profile"
          sheetTitle="Language profile"
          sheetDescription="The language background that gives your recordings context."
        >
          <dl>
            <ProfileInfoBlock
              label="Preferred variety"
              value={formatPreferredVarietyLabel(profile?.preferredVariety ?? "") || "Not set"}
            />
            <ProfileInfoBlock
              label="Native language(s)"
              value={profile?.nativeLanguages ?? "Not set"}
            />
            <ProfileInfoBlock
              label="Pidgin fluency"
              value={formatFluencyLabel(profile?.pidginFluency ?? "") || "Not set"}
            />
            <ProfileInfoBlock
              label="English fluency"
              value={formatFluencyLabel(profile?.englishFluency ?? "") || "Not set"}
            />
            <ProfileInfoBlock
              label="Languages at home"
              value={profile?.homeLanguages ?? "Not set"}
            />
          </dl>
        </ProfileActionRow>

        <ProfileActionRow
          icon={<MapPointWave size={20} weight="Outline" />}
          title="Location & accent"
          sheetTitle="Location & accent"
          sheetDescription="This helps Alva interpret regional speech patterns correctly."
        >
          <dl>
            <ProfileInfoBlock
              label="State of origin"
              value={profile?.stateOfOrigin ?? "Not set"}
            />
            <ProfileInfoBlock label="Ethnicity" value={profile?.ethnicity ?? "Not set"} />
            {profile?.occupation ? (
              <ProfileInfoBlock label="Occupation" value={profile.occupation} />
            ) : null}
          </dl>
        </ProfileActionRow>

        <ProfileActionRow
          icon={<Smartphone size={20} weight="Outline" />}
          title="Recording setup"
          sheetTitle="Recording setup"
          sheetDescription="Useful for QA when a clip sounds unusually quiet or noisy."
        >
          <dl>
            <ProfileInfoBlock
              label="Self-reported device"
              value={formatRecordingDeviceLabel(profile?.recordingDevice ?? "") || "Not set"}
            />
            <ProfileInfoBlock
              label="Detected device"
              value={profile?.detectedDeviceLabel ?? "Not detected"}
            />
            <ProfileInfoBlock
              label="Detected mic"
              value={profile?.detectedMicLabel ?? "Not detected"}
            />
            <ProfileInfoBlock
              label="Default mode"
              value={isStaff ? "Focus group" : "Prompt reader"}
            />
          </dl>
        </ProfileActionRow>

        <ProfileActionRow
          icon={<ShieldCheck size={20} weight="Outline" />}
          title="Consent & privacy"
          sheetTitle="Consent & privacy"
          sheetDescription="Your consent records and how Alva is allowed to use submitted audio."
        >
          <dl>
            <ProfileInfoBlock label="Consent status" value="Accepted" />
            <ProfileInfoBlock label="Data usage" value="Speech research and dataset creation" />
            <ProfileInfoBlock label="Terms" value="Accepted during account setup" />
          </dl>
        </ProfileActionRow>

        <ProfileActionRow
          icon={<Bell size={20} weight="Outline" />}
          title="Notifications"
          sheetTitle="Notifications"
          sheetDescription="How often Alva should nudge you about reviews, points, and new tasks."
        >
          <dl>
            <ProfileInfoBlock label="Review updates" value="On" />
            <ProfileInfoBlock label="Point log alerts" value="On" />
            <ProfileInfoBlock label="Recording reminders" value="Weekly" />
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
    </div>
  );

  if (isMobile) {
    return (
      <div className="relative min-h-full overflow-hidden px-4 py-6">
        <AlvaTopGlow intensity="soft" />
        {content}
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <AlvaTopGlow intensity="soft" />
      <DesktopPageShell>{content}</DesktopPageShell>
    </div>
  );
}
