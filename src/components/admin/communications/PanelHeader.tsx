import { motion } from "framer-motion";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";

const SPRING = { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.9 };

/** The message panel's top: its tabs as one pill, and close. */
export function PanelHeader<T extends string>({
  tabs,
  value,
  onChange,
  onClose,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (tab: T) => void;
  onClose: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-4">
      <div role="tablist" className="flex flex-1 items-center gap-1 rounded-full bg-alva-surface p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={value === item.id}
            onClick={() => onChange(item.id)}
            className="relative flex-1 rounded-full py-1.5 text-sm text-muted-foreground transition-colors aria-selected:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            {value === item.id ? (
              <motion.span
                layoutId="comms-tab"
                className="absolute inset-0 rounded-full bg-alva-card"
                transition={SPRING}
              />
            ) : null}
            <span className="relative">{item.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
      >
        <CloseCircle size={22} weight="Outline" />
      </button>
    </header>
  );
}
