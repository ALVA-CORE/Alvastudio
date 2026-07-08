import { cn } from "@/lib/utils";

type AlvaLogoProps = {
  className?: string;
  /** Light logo for dark backgrounds (default). Dark logo for light backgrounds. */
  variant?: "light" | "dark";
};

export function AlvaLogo({ className, variant = "light" }: AlvaLogoProps) {
  const src =
    variant === "light"
      ? "/assets/logos/logo.svg"
      : "/assets/logos/logo-dark.svg";

  return (
    <img
      src={src}
      alt="Alva Studio"
      className={cn("h-10 w-auto", className)}
    />
  );
}
