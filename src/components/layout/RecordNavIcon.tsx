import { SiriBlob } from "@/components/studio/SiriBlob";

type RecordNavIconProps = {
  active?: boolean;
  className?: string;
};

/** @deprecated Use SiriBlob size="nav" directly */
export function RecordNavIcon({ className }: RecordNavIconProps) {
  return <SiriBlob size="nav" className={className} />;
}
