import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/context";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Account & settings</p>

      <Card className="mt-6 border-alva-border bg-alva-card">
        <CardHeader>
          <CardTitle className="text-lg">{user?.fullName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{user?.email}</p>
          {user?.phone && <p>{user.phone}</p>}
          <p className="capitalize text-primary">{user?.role}</p>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="mt-6 w-full"
        size="lg"
        onClick={handleLogout}
      >
        Sign out
      </Button>
    </div>
  );
}
