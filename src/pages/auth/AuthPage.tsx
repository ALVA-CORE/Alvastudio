import { BorderBeamCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <header className="text-center">
          <p className="text-sm uppercase tracking-widest text-alva-accent">
            Alva Core
          </p>
          <h1 className="mt-2 font-display text-4xl text-foreground">
            Alva Studio
          </h1>
          <p className="mt-2 text-muted-foreground">
            Nigerian English & Pidgin speech data collection
          </p>
        </header>

        <BorderBeamCard beam="pulse-inner">
          <Card className="border-alva-border bg-alva-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Sign in</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Auth & onboarding wizard — coming in Phase 2.
            </CardContent>
          </Card>
        </BorderBeamCard>
      </div>
    </div>
  );
}
