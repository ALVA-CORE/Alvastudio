import Logout from "@solar-icons/react/arrows-action/Logout";
import Smartphone from "@solar-icons/react/devices/Smartphone";
import Translation2 from "@solar-icons/react/it/Translation2";
import MapPointWave from "@solar-icons/react/map/MapPointWave";
import Bell from "@solar-icons/react/notifications/Bell";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import UserId from "@solar-icons/react/users/UserId";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileInfoBlock } from "@/components/profile/ProfileInfoBlock";
import { TextureButton } from "@/components/ui/texture-button";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.fullName?.split(" ")[0] ?? "User";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="relative min-h-full overflow-hidden px-4 py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(circle_at_top,hsl(var(--alva-accent)/0.22),transparent_68%)]"
      />

      <div className="relative">
        <ProfileHero
          name={user?.fullName ?? "Alva Contributor"}
          phone={user?.phone}
          role={user?.role ?? "contributor"}
          seed={user?.email ?? firstName}
        />

        <section className="mt-8">
        <ProfileActionRow
          icon={<UserId size={20} weight="Outline" />}
          title="Account details"
          value={user?.email ?? "No email added"}
          sheetTitle="Account details"
          sheetDescription="Your core identity for Alva Studio."
        >
          <div className="space-y-3">
            <ProfileInfoBlock label="Full name" value={user?.fullName ?? "Not set"} />
            <ProfileInfoBlock label="Email" value={user?.email ?? "Not set"} />
            <ProfileInfoBlock label="Phone" value={user?.phone ?? "Not set"} />
            <ProfileInfoBlock
              label="Role"
              value={user?.role ? `${user.role[0].toUpperCase()}${user.role.slice(1)}` : "Contributor"}
            />
          </div>
        </ProfileActionRow>

        <ProfileActionRow
          icon={<Translation2 size={20} weight="Outline" />}
          title="Language profile"
          value="Nigerian English · Pidgin"
          sheetTitle="Language profile"
          sheetDescription="The language background that gives your recordings context."
        >
          <div className="space-y-3">
            <ProfileInfoBlock label="Preferred variety" value="Nigerian English" />
            <ProfileInfoBlock label="Native language(s)" value="To be collected during onboarding" />
            <ProfileInfoBlock label="Pidgin fluency" value="To be collected during onboarding" />
          </div>
        </ProfileActionRow>

        <ProfileActionRow
          icon={<MapPointWave size={20} weight="Outline" />}
          title="Location & accent"
          value="Origin, residence, and accent context"
          sheetTitle="Location & accent"
          sheetDescription="This helps Alva interpret regional speech patterns correctly."
        >
          <div className="space-y-3">
            <ProfileInfoBlock label="State of origin" value="To be collected during onboarding" />
            <ProfileInfoBlock label="State of residence" value="To be collected during onboarding" />
            <ProfileInfoBlock label="Accent influence" value="Where you feel your accent comes from most" />
          </div>
        </ProfileActionRow>

        <ProfileActionRow
          icon={<Smartphone size={20} weight="Outline" />}
          title="Recording setup"
          value="Device and mic context"
          sheetTitle="Recording setup"
          sheetDescription="Useful for QA when a clip sounds unusually quiet or noisy."
        >
          <div className="space-y-3">
            <ProfileInfoBlock label="Primary device" value="Mobile phone" />
            <ProfileInfoBlock label="Mic setup" value="Self-reported during onboarding" />
            <ProfileInfoBlock label="Default mode" value="Prompt reader" />
          </div>
        </ProfileActionRow>

        <ProfileActionRow
          icon={<ShieldCheck size={20} weight="Outline" />}
          title="Consent & privacy"
          value="NDPA and data use"
          sheetTitle="Consent & privacy"
          sheetDescription="Your consent records and how Alva is allowed to use submitted audio."
        >
          <div className="space-y-3">
            <ProfileInfoBlock label="Consent status" value="Accepted" />
            <ProfileInfoBlock label="Data usage" value="Speech research and dataset creation" />
            <ProfileInfoBlock label="Terms" value="Accepted during account setup" />
          </div>
        </ProfileActionRow>

        <ProfileActionRow
          icon={<Bell size={20} weight="Outline" />}
          title="Notifications"
          value="Review updates and reminders"
          sheetTitle="Notifications"
          sheetDescription="How often Alva should nudge you about reviews, points, and new tasks."
        >
          <div className="space-y-3">
            <ProfileInfoBlock label="Review updates" value="On" />
            <ProfileInfoBlock label="Point log alerts" value="On" />
            <ProfileInfoBlock label="Recording reminders" value="Weekly" />
          </div>
        </ProfileActionRow>

        <ProfileActionRow
          icon={<Logout size={20} weight="Outline" />}
          title="Sign out"
          sheetTitle="Sign out"
          sheetDescription="You can always come back with your account details."
          hideDivider
        >
          <div className="space-y-5">
            <p className="text-center text-sm text-muted-foreground">
              Sign out of this device for {user?.fullName ?? "your account"}.
            </p>
            <div className="flex justify-center">
              <TextureButton
                variant="destructive"
                size="lg"
                className="w-full max-w-[220px]"
                onClick={handleLogout}
              >
                Sign out now
              </TextureButton>
            </div>
          </div>
        </ProfileActionRow>
        </section>
      </div>
    </div>
  );
}
