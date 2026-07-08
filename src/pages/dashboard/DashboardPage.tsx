import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="font-display text-2xl">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Contributor & intern stats
      </p>

      <Card className="mt-6 border-alva-border bg-alva-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Your progress</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Role-aware stats placeholder.
        </CardContent>
      </Card>
    </div>
  );
}
