import { ALVA_LINKS } from "@/lib/links";

/**
 * The terms and privacy policy, as links rather than as words.
 *
 * Every sign-up form asked people to agree to "the terms and conditions"
 * with nothing to click. Consent to a document nobody can open is not
 * consent, and it is the sort of thing that only looks like a detail until
 * somebody asks what exactly was agreed to.
 *
 * They open in a new tab deliberately: this sits inside a long form, and
 * navigating away would discard everything typed so far.
 */
export function ConsentLinks() {
  return (
    <>
      I agree to the{" "}
      <ExternalLink href={ALVA_LINKS.terms}>terms and conditions</ExternalLink>{" "}
      and the{" "}
      <ExternalLink href={ALVA_LINKS.privacy}>NDPA data-use policy</ExternalLink>
    </>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      /* The checkbox's label wraps this, and a click on a label toggles the
         checkbox. Without this, opening the terms also ticks the box that
         says you have read them. */
      onClick={(event) => event.stopPropagation()}
      className="font-medium text-primary underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}
