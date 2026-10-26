import { useNavigate } from "react-router-dom";
import Logout from "@solar-icons/react/arrows-action/Logout";
import UserId from "@solar-icons/react/users/UserId";
import ShieldUser from "@solar-icons/react/security/ShieldUser";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AlvaTopGlow } from "@/components/shared/AlvaTopGlow";
import { AppVersionFooter } from "@/components/profile/AppVersionFooter";
import { ChangePasswordRow } from "@/components/profile/ChangePasswordRow";
import { FeedbackRow } from "@/components/profile/FeedbackRow";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileInfoBlock } from "@/components/profile/ProfileInfoBlock";
import { TextureButton } from "@/components/ui/texture-button";
import { useAuth } from "@/lib/auth/context";

/**
 * The admin's own account, in the same grammar as the other profile pages.
 *
 * It used to carry a "Backend readiness" list saying which admin areas the
 * API could serve. That was a note between engineers wearing a product's
 * clothes: every area is live now, and a list that said so told an admin
 * nothing they could act on.
 */
export default function AdminSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.fullName?.split(" ")[0] ?? "Admin";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="relative min-h-full overflow-hidden">
      <AlvaTopGlow intensity="soft" />
      <DesktopPageShell>
        <ProfileHero
          name={user?.fullName ?? "Alva Admin"}
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
              <ProfileInfoBlock label="Role" value="Admin" />
            </dl>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<ShieldUser size={20} weight="Outline" />}
            title="What this account can do"
            sheetTitle="Admin permissions"
          >
            <dl>
              <ProfileInfoBlock label="Create and remove accounts" value="Yes" />
              <ProfileInfoBlock label="Change payment rates" value="Yes" />
              <ProfileInfoBlock label="See every contributor's earnings" value="Yes" />
              <ProfileInfoBlock label="Edit the prompt and stimulus banks" value="Yes" />
              <ProfileInfoBlock label="Intern and annotator surfaces" value="Yes" />
            </dl>
          </ProfileActionRow>

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
