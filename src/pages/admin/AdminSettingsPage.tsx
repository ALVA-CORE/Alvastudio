import { useNavigate } from "react-router-dom";
import Logout from "@solar-icons/react/arrows-action/Logout";
import UserId from "@solar-icons/react/users/UserId";
import ShieldUser from "@solar-icons/react/security/ShieldUser";
import Notebook2 from "@solar-icons/react/school/Notebook2";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AlvaTopGlow } from "@/components/shared/AlvaTopGlow";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileInfoBlock } from "@/components/profile/ProfileInfoBlock";
import { TextureButton } from "@/components/ui/texture-button";
import { ADMIN_NAV_ITEMS } from "@/components/admin/layout/adminNav";
import { useAuth } from "@/lib/auth/context";

const STATUS_TEXT = {
  ready: "API ready",
  partial: "API partly ready",
  blocked: "Blocked on backend",
} as const;

/**
 * The admin's own account, in the same grammar as the other profile pages.
 *
 * The one addition is the readiness list: this surface is the only one where
 * what the backend can and cannot do is the admin's problem rather than an
 * engineer's, so it is worth being able to read it without leaving the app.
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
            sheetDescription="Your admin account on Alvastudio."
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
            sheetDescription="An admin can reach every surface in the product."
          >
            <dl>
              <ProfileInfoBlock label="Create and remove accounts" value="Yes" />
              <ProfileInfoBlock label="Change payment rates" value="Yes" />
              <ProfileInfoBlock label="See every contributor's earnings" value="Yes" />
              <ProfileInfoBlock label="Edit the prompt and stimulus banks" value="Yes" />
              <ProfileInfoBlock label="Intern and annotator surfaces" value="Yes" />
            </dl>
          </ProfileActionRow>

          <ProfileActionRow
            icon={<Notebook2 size={20} weight="Outline" />}
            title="Backend readiness"
            sheetTitle="Backend readiness"
            sheetDescription="Which admin areas the API can serve today."
            hideDivider
          >
            <dl>
              {ADMIN_NAV_ITEMS.filter((item) => item.id !== "settings").map((item) => (
                <ProfileInfoBlock
                  key={item.id}
                  label={item.title}
                  value={STATUS_TEXT[item.status]}
                />
              ))}
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
