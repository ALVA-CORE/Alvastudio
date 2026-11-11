import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Letter from "@solar-icons/react/messages/Letter";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import Plain from "@solar-icons/react/messages/Plain";
import { BorderBeam } from "border-beam";
import { TextureButton } from "@/components/ui/texture-button";
import { WaveFill } from "@/components/shared/wave-fill";
import { ComposeTab } from "@/components/admin/communications/ComposeTab";
import { SentTab } from "@/components/admin/communications/SentTab";
import { EmailPreviewFrame } from "@/components/admin/communications/EmailPreviewFrame";
import { useCommsComposer } from "@/hooks/useCommsComposer";
import { useContributorDirectory } from "@/hooks/useContributorDirectory";
import { useAuth } from "@/lib/auth/context";
import {
  COMMUNICATION_HERO,
  DEFAULT_ACTION_LABEL,
  DEFAULT_ACTION_URL,
  renderEmailHtml,
} from "@/lib/admin/emailTemplate";
import { ApiError } from "@/lib/api/client";
import { alvaToast } from "@/lib/alva-toast";
import { reportApiError } from "@/lib/api/reportApiError";
import type { AdminPermission } from "@/data/admin/users";
import { cn } from "@/lib/utils";

type Tab = "compose" | "preview" | "sent";

const TABS: { id: Tab; label: string }[] = [
  { id: "compose", label: "Compose" },
  { id: "preview", label: "Preview" },
  { id: "sent", label: "Sent" },
];

const SPRING = { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.9 };

/**
 * Email contributors from anywhere on the admin surface.
 *
 * A textured button bottom right of every admin screen. It grows into the
 * panel (one shared layout, so the button becomes the panel rather than a
 * panel appearing beside it) and shrinks back. Compose, Preview and Sent are
 * tabs inside it.
 *
 * The page underneath stays usable: no overlay, no focus trap. Escape closes
 * it, and what was being written is kept.
 */
export function CommsLauncher() {
  const { user } = useAuth();
  const permissions = user?.adminPermissions as AdminPermission[] | undefined;
  const allowed =
    user?.role === "admin" && (permissions === undefined || permissions.includes("communications"));

  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [tab, setTab] = useState<Tab>("compose");
  const [sentVersion, setSentVersion] = useState(0);
  const [testing, setTesting] = useState(false);
  const reduceMotion = useReducedMotion();

  const composer = useCommsComposer();
  const directory = useContributorDirectory(allowed && everOpened);

  const panel = useRef<HTMLElement>(null);

  /* Escape, or a press anywhere outside, closes it; what was written stays.
     The panel's own dropdowns and the toasts render outside it, in portals,
     so a press on those is not "outside". */
  useEffect(() => {
    if (!open) return;
    setEverOpened(true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target || panel.current?.contains(target)) return;
      if (
        target.closest(
          '[data-radix-popper-content-wrapper],[role="listbox"],[role="menu"],[data-sonner-toaster],[data-alva-toaster]'
        )
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [open]);

  const { fields } = composer;

  /* Fetched ahead, so the preview's image is in the cache before the tab is
     opened: the brand image as soon as the panel is, a new hero as soon as
     it is set. */
  const heroSrc = fields.hero ?? COMMUNICATION_HERO;
  useEffect(() => {
    if (!everOpened) return;
    const image = new Image();
    image.decoding = "async";
    image.src = heroSrc;
  }, [everOpened, heroSrc]);
  const html = useMemo(
    () =>
      renderEmailHtml({
        title: fields.header.trim() || "Header",
        body: fields.body.trim() || "Body",
        action: fields.button.trim() || DEFAULT_ACTION_LABEL,
        url: fields.link.trim() || DEFAULT_ACTION_URL,
        hero: heroSrc,
        markdown: Boolean(fields.body.trim()),
      }),
    [fields, heroSrc]
  );

  if (!allowed) return null;

  const { stage } = composer;

  const press = async () => {
    try {
      if (stage.kind === "idle") {
        const blocked = await composer.prepare();
        if (blocked) alvaToast.error(blocked);
        return;
      }
      if (stage.kind === "confirm") {
        const queued = await composer.send();
        if (!queued) return;
        alvaToast.success(`Sending to ${queued.delivery.total.toLocaleString()}`);
        setSentVersion((value) => value + 1);
        setTab("sent");
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 503) {
        alvaToast.error("Email is unavailable on the server. Nothing was sent.");
        return;
      }
      if (cause instanceof ApiError && cause.status === 409) {
        alvaToast.error(cause.message);
        return;
      }
      /* Lost, or refused for a reason we did not expect. The send is safe to
         repeat against the same draft, so the Sent tab is where to look. */
      alvaToast.error(reportApiError(cause, "Could not confirm that. Check Sent.") ?? "Could not confirm that.");
      setSentVersion((value) => value + 1);
    }
  };

  /* Saves the draft, then sends it to this admin alone. */
  const sendTest = async () => {
    setTesting(true);
    try {
      const sentTo = await composer.sendTest();
      alvaToast.success(`Test sent to ${sentTo}`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 503) {
        alvaToast.error("Email is unavailable on the server.");
        return;
      }
      alvaToast.error(reportApiError(cause, "Could not send the test.") ?? "Could not send the test.");
    } finally {
      setTesting(false);
    }
  };

  const busy = stage.kind === "checking" || stage.kind === "sending";
  const confirming = stage.kind === "confirm";

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40">
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.section
            ref={panel}
            key="panel"
            layoutId="comms-launcher"
            role="dialog"
            aria-label="Email contributors"
            initial={reduceMotion ? { opacity: 0 } : undefined}
            transition={SPRING}
            style={{ borderRadius: 28 }}
            className="pointer-events-auto flex h-[min(46rem,calc(100vh-3rem))] w-[min(30rem,calc(100vw-3rem))] flex-col overflow-hidden border border-alva-border bg-alva-card shadow-[0_24px_80px_-20px_rgba(0,0,0,0.8)]"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.2 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <header className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-4">
                <div role="tablist" className="flex flex-1 items-center gap-1 rounded-full bg-alva-surface p-1">
                  {TABS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === item.id}
                      onClick={() => setTab(item.id)}
                      className="relative flex-1 rounded-full py-1.5 text-sm text-muted-foreground transition-colors aria-selected:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                    >
                      {tab === item.id ? (
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
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                >
                  <CloseCircle size={22} weight="Outline" />
                </button>
              </header>

              <div className="relative min-h-0 flex-1">
                <div
                  className={cn(
                    "alva-thin-scrollbar absolute inset-0 overflow-y-auto px-4 pb-4 pt-2",
                    tab === "preview" && "pointer-events-none invisible"
                  )}
                >
                  <AnimatePresence initial={false} mode="wait">
                    {tab !== "preview" ? (
                      <motion.div
                        key={tab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16 }}
                      >
                        {tab === "compose" ? (
                          <ComposeTab
                            fields={fields}
                            set={composer.set}
                            contributors={directory.contributors}
                          />
                        ) : (
                          <SentTab version={sentVersion} />
                        )}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Always mounted, shown or not. Unmounted, every visit to
                    the tab rebuilt the email and fetched the hero again,
                    which is the wait people saw. Hidden by opacity rather
                    than `display`, so it keeps its size and its fit. */}
                <motion.div
                  initial={false}
                  animate={{ opacity: tab === "preview" ? 1 : 0, y: tab === "preview" ? 0 : 6 }}
                  transition={{ duration: 0.16 }}
                  aria-hidden={tab !== "preview"}
                  className={cn(
                    "absolute inset-0 px-4 pb-4 pt-2",
                    tab !== "preview" && "pointer-events-none"
                  )}
                >
                  <EmailPreviewFrame html={html} />
                </motion.div>
              </div>

              <AnimatePresence initial={false}>
                {tab !== "sent" ? (
                  <motion.footer
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 overflow-hidden border-t border-alva-border"
                  >
                    <div className="flex items-center gap-2 px-4 py-3">
                      <AnimatePresence initial={false}>
                        {confirming ? (
                          <motion.button
                            type="button"
                            aria-label="Cancel"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            onClick={composer.cancel}
                            className="overflow-hidden whitespace-nowrap rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            Cancel
                          </motion.button>
                        ) : null}
                      </AnimatePresence>
                      {!confirming && !fields.heroUploading ? (
                        <TextureButton
                          variant="minimal"
                          size="default"
                          className="w-auto shrink-0"
                          loading={testing}
                          disabled={!composer.valid || busy}
                          onClick={() => void sendTest()}
                        >
                          Send me a test
                        </TextureButton>
                      ) : null}
                      {/* While the hero uploads, Send is its progress: a green
                          wave filling it as the bytes go. Full, it is the green
                          button it was filling up to. */}
                      {fields.heroUploading ? (
                        <div
                          role="progressbar"
                          aria-label="Uploading image"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(fields.heroProgress * 100)}
                          className="relative flex h-[42px] flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-alva-surface text-sm font-semibold text-muted-foreground"
                        >
                          Send
                          <Plain size={16} weight="Bold" />
                          {/* Many small crests rather than a few tall ones:
                              the button is wide and short, and a big wave
                              across it reads as a slope. */}
                          <WaveFill
                            progress={fields.heroProgress}
                            amplitude={0.012}
                            cycles={3.5}
                            fillClassName="bg-alva-accent font-semibold text-alva-bg"
                            aheadClassName="bg-alva-accent/30"
                          >
                            Send
                            <Plain size={16} weight="Bold" />
                          </WaveFill>
                        </div>
                      ) : (
                      <TextureButton
                          variant="alva"
                          size="default"
                          className="flex-1"
                          loading={busy}
                          disabled={!composer.valid || testing || (confirming && Boolean(stage.blocked))}
                          title={confirming && stage.blocked ? stage.blocked : undefined}
                          onClick={() => void press()}
                        >
                          <AnimatePresence initial={false} mode="popLayout">
                            <motion.span
                              key={confirming ? "confirm" : "send"}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.18 }}
                              className="tabular-nums"
                            >
                              {confirming && !stage.blocked
                                ? `Send to ${stage.count.toLocaleString()}`
                                : "Send"}
                            </motion.span>
                          </AnimatePresence>
                          <Plain size={16} weight="Bold" />
                        </TextureButton>
                      )}
                    </div>
                  </motion.footer>
                ) : null}
              </AnimatePresence>
            </motion.div>
          </motion.section>
        ) : (
          /* The beam sits on the button's own border, as on the play
             buttons. Every wrapper stays `overflow-visible`, or the glow is
             clipped back to a flat ring. */
          <motion.div
            key="launcher"
            layoutId="comms-launcher"
            transition={SPRING}
            style={{ borderRadius: 999 }}
            whileHover={reduceMotion ? undefined : { scale: 1.06 }}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            className="pointer-events-auto overflow-visible rounded-full"
          >
            <BorderBeam
              size="sm"
              colorVariant="mono"
              theme="dark"
              strength={1}
              duration={2.4}
              borderRadius={999}
              className="overflow-visible rounded-full"
            >
              {/* The grey textured face every icon button wears. */}
              <TextureButton
                variant="icon"
                size="icon"
                aria-label="Email contributors"
                onClick={() => setOpen(true)}
                className="relative z-[1] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.9)]"
              >
                <span className="flex size-8 items-center justify-center">
                  <Letter size={22} weight="Bold" className="text-alva-accent" />
                </span>
              </TextureButton>
            </BorderBeam>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
