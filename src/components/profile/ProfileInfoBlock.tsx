import { cn } from "@/lib/utils";

type ProfileInfoBlockProps = {
  label: string;
  value: string;
  className?: string;
};

export function ProfileInfoBlock({
  label,
  value,
  className,
}: ProfileInfoBlockProps) {
  return (
    <div className={cn("rounded-2xl bg-alva-surface px-4 py-3", className)}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
