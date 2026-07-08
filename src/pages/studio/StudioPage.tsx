import { BorderBeamCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudioPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="font-display text-2xl">Studio</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Prompt Reader · Stimuli · Focus Group
      </p>

      <BorderBeamCard beam="md" className="mt-6">
        <Card className="border-alva-border bg-alva-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Capture</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Recording shell with mode switcher.
          </CardContent>
        </Card>
      </BorderBeamCard>
    </div>
  );
}
