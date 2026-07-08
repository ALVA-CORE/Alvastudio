import Microphone3 from "@solar-icons/react/video/Microphone3";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import VolumeLoud from "@solar-icons/react/video/VolumeLoud";
import { BorderBeamCard } from "@/components/shared";
import { cn } from "@/lib/utils";

type DetailItem = {
  label: string;
  value: string;
};

type StudioSessionDetailsProps = {
  title: string;
  subtitle: string;
  details: DetailItem[];
  className?: string;
};

const icons = [Microphone3, VolumeLoud, ShieldCheck, UsersGroupRounded];

export function StudioSessionDetails({
  title,
  subtitle,
  details,
  className,
}: StudioSessionDetailsProps) {
  return (
    <BorderBeamCard beam="pulse-inner" className={cn("rounded-[28px]", className)}>
      <section className="rounded-[28px] bg-alva-card px-5 py-5">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="mt-5 space-y-3">
          {details.map((detail, index) => {
            const Icon = icons[index % icons.length];

            return (
              <div
                key={detail.label}
                className="flex items-start gap-3 rounded-2xl bg-alva-surface px-3 py-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-alva-bg/80 text-alva-accent">
                  <Icon size={17} weight="BoldDuotone" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {detail.label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {detail.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </BorderBeamCard>
  );
}
