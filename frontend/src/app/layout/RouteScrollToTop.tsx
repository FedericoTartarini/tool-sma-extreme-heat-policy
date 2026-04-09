import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Resets scroll position for pathname-changing route navigations.
 */
export function RouteScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const hasMountedRef = useRef(false);
  const navigationTypeRef = useRef(navigationType);

  useLayoutEffect(() => {
    navigationTypeRef.current = navigationType;
  }, [navigationType]);

  useLayoutEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (navigationTypeRef.current === "POP") {
      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
    });
  }, [pathname]);

  return null;
}
