import { Navigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import InternDashboard from "@/pages/interns/InternDashboard";

export default function InternDashboardPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <Navigate to="/contributor/dashboard" replace />;
  }

  return <InternDashboard />;
}
