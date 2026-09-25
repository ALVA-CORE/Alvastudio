import { PanelRow } from "@/components/shared/PanelPrimitives";

type ProfileInfoBlockProps = {
  label: string;
  value: string;
  className?: string;
};

/**
 * One label/value fact in a profile section or detail sheet.
 *
 * Now a thin wrapper over the shared `PanelRow` rather than its own filled box.
 * A column of boxed values puts a border around every single word, so reading
 * six facts means parsing six containers — and inside a sheet that is already a
 * panel, it stacks surface on surface. The row keeps one alignment to follow and
 * no containers at all.
 *
 * Renders `<dt>/<dd>`, so the parent must be a `<dl>`.
 */
export function ProfileInfoBlock({ label, value, className }: ProfileInfoBlockProps) {
  return <PanelRow label={label} value={value} className={className} />;
}
