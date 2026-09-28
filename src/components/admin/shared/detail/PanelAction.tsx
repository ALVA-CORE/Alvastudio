import type { ReactNode } from "react";
import { TextureButton } from "@/components/ui/texture-button";

/**
 * One button in a detail panel's footer.
 *
 * A thin wrapper so every panel's footer is built from the same call rather
 * than each one picking its own variant and size. `w-auto` is the point: the
 * footer sizes buttons to their labels, and three stretched to equal thirds
 * gives a one-word button the same width as a three-word one.
 */
export function PanelAction({
  label,
  icon,
  onClick,
  tone = "default",
  loading = false,
  disabled = false,
}: {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger" | "primary";
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TextureButton
      variant={tone === "danger" ? "destructive" : tone === "primary" ? "alva" : "minimal"}
      size="sm"
      className="w-auto"
      loading={loading}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </TextureButton>
  );
}
