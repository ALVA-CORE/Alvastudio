import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReviewPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="font-display text-2xl">Review</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Intern QA queue
      </p>

      <Card className="mt-6 border-alva-border bg-alva-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Queue</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Audio player + 5-question quality form.
        </CardContent>
      </Card>
    </div>
  );
}
