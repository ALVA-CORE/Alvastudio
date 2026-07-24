import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { alvaAccentTextureClass } from "@/lib/alva-texture";
import { diceBearAvatarUrl } from "@/lib/dicebear";
import { cn } from "@/lib/utils";

type ProfileHeroProps = {
  name: string;
  phone?: string;
  seed: string;
  className?: string;
};

export function ProfileHero({ name, phone, seed, className }: ProfileHeroProps) {
  return (
    <section className={cn("flex flex-col items-center text-center", className)}>
      <Avatar
        className={cn(
          alvaAccentTextureClass,
          "size-24 border-0 bg-transparent shadow-none ring-0"
        )}
      >
        <AvatarImage src={diceBearAvatarUrl(seed, "202020")} alt={name} />
        <AvatarFallback className="bg-alva-card text-xl font-semibold text-foreground">
          {name
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </AvatarFallback>
      </Avatar>

      <h1 className="mt-4 text-xl font-semibold text-foreground">{name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {phone ?? "No phone number added yet"}
      </p>
    </section>
  );
}
