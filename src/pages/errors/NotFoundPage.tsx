import { useNavigate } from "react-router-dom";
import { ThinkingOrbIcon } from "@/components/ui/thinking-orb-icon";
import { TextureButton } from "@/components/ui/texture-button";
import { useMinWidth } from "@/hooks/use-min-width";

const DIGIT = "text-8xl sm:text-9xl";

/**
 * 404, with the orb standing in for the zero.
 *
 * The orb is sized to the digits' cap height rather than their font size. Caps
 * run about 0.72em, so a 96px "4" is a 69px glyph; matching the font size
 * instead would leave a circle noticeably taller than the numerals beside it.
 *
 * Ported from alvacore-landing-page so a bad link looks the same on either
 * side of the login. The marketing site's header is left off — this side of
 * the app has no public nav to offer.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  // One step per digit step. 96px caps at 69, 128px caps at 92, and both sit
  // at or under the library's 64px design, so neither is stretched.
  const sm = useMinWidth("(min-width: 640px)", true);
  const orb = sm ? 92 : 69;

  /* React Router numbers its own history entries. Index 0 means this is the
   * first page of the session — a pasted or bookmarked bad link — and going
   * "back" from there leaves the app entirely. Those people are sent to their
   * own dashboard instead, which is what `/` resolves to per role.
   *
   * The label says which of the two will happen, because "back" and "home" are
   * different promises and getting the wrong one is disorienting. */
  const entry = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  const canGoBack = entry > 0;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-alva-bg px-5 py-24 text-center sm:py-28">
      {/* The numerals are decorative once the orb replaces one of them, so
          the page says what it is here instead. */}
      <h1 className="sr-only">404, page not found</h1>

      <div aria-hidden className="flex items-center justify-center gap-2 sm:gap-3">
        <Digit />
        <ThinkingOrbIcon px={orb} />
        <Digit />
      </div>

      <p className="mt-2 text-xl font-semibold tracking-tight sm:mt-10 sm:text-2xl">
        This page doesn&apos;t exist
      </p>

      <div className="mt-6 sm:mt-7">
        {/* Not `asChild`: the texture button wraps its label in its own face,
            so slotting a <Link> in makes only the text clickable and drops the
            button element. Navigating from onClick keeps the whole face live. */}
        <TextureButton
          variant="secondary"
          size="default"
          className="w-auto"
          onClick={() => (canGoBack ? navigate(-1) : navigate("/"))}
        >
          {canGoBack ? "Take me back" : "Go to my dashboard"}
        </TextureButton>
      </div>
    </main>
  );
}

function Digit() {
  return <span className={`${DIGIT} font-medium leading-none tracking-tight`}>4</span>;
}
