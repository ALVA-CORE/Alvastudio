import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { titleForPath } from "@/lib/document-title";

/**
 * Keeps the tab title in step with the route.
 *
 * Mounted once inside the router rather than per page: one place to read, and
 * a page that forgets to set a title cannot leave the previous one showing.
 */
export function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titleForPath(pathname);
  }, [pathname]);

  return null;
}
