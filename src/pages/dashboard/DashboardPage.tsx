import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";
import { Card, CardContent } from "@/components/ui/card";
import { TextureButton } from "@/components/ui/texture-button";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";

const stats = [
  { label: "Recordings", value: "0", hint: "Completed sessions" },
  { label: "Prompts read", value: "0", hint: "Component 1" },
  { label: "Hours", value: "0.0", hint: "Stimuli narration" },
  { label: "Approved", value: "0", hint: "Passed QA" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Good to see you,</p>
        <h1 className="text-2xl font-semibold text-foreground">{firstName}</h1>
      </header>

      <Card className="border-alva-border bg-alva-card">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Ready to record?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Read prompts or narrate stimuli
            </p>
          </div>
          <TextureButton asChild variant="icon" size="icon">
            <Link to="/studio" aria-label="Go to record">
              <Microphone3 size={20} weight="BoldDuotone" className="text-alva-accent" />
            </Link>
          </TextureButton>
        </CardContent>
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Your progress</h2>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-alva-border bg-alva-surface">
              <CardContent className="p-4">
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{stat.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <Card className="border-alva-border bg-alva-surface">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Payment status</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Coming soon</p>
            </div>
            <span className="rounded-full bg-alva-card px-2.5 py-1 text-xs text-muted-foreground">
              Pending
            </span>
          </CardContent>
        </Card>
      </section>

      <TextureButton asChild variant="alva" size="lg" className="mt-6 w-full">
        <Link to="/studio">
          <span className="flex items-center justify-center gap-2">
            Start recording
            <AltArrowRight size={18} weight="Outline" />
          </span>
        </Link>
      </TextureButton>
    </div>
  );
}
