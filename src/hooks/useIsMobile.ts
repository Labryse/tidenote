import { useState, useEffect } from "react";

const MOBILE_QUERY = "(max-width: 767.98px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
    } else {
      (mql as any).addListener(onChange);
    }

    setIsMobile(mql.matches);

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange);
      } else {
        (mql as any).removeListener(onChange);
      }
    };
  }, []);

  return isMobile;
}

export default useIsMobile;
