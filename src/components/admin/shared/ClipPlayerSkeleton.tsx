import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The clip player, while the audio is still being fetched.
 *
 * The route is authenticated, so the file comes down as a blob before the
 * player can have it. Without this the panel simply had no player for a
 * second or two and then grew one, which reads as "there is no audio on this
 * clip" rather than "the audio is coming".
 *
 * Mirrors the real player's shape: transport on the left, a waveform line,
 * and the timestamp on the right.
 */
export function ClipPlayerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-2xl bg-alva-surface p-4", className)}
      aria-busy
      aria-label="Loading the clip"
    >
      <Skeleton className="h-10 w-full rounded-lg" />

      <div className="mt-3 flex items-center gap-3">
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="size-9 shrink-0 rounded-full bg-alva-accent/15" />
        <Skeleton className="h-6 w-9 rounded-full" />
        <Skeleton className="ml-auto h-3 w-16 rounded-full" />
      </div>
    </div>
  );
}
