import { useEffect, useState } from "react";

import { resolveProgressivePair } from "@/lib/media-compacted";

// Track the progressive swap: start on the compacted twin, then advance to
// the full-resolution source once it has been decoded by the browser. The
// element is reused, so the swap is a pure opacity release with zero CLS.
export function useProgressiveImage(url: string): {
  low: string;
  high: string;
  highReady: boolean;
} {
  const [state, setState] = useState(() => {
    const { low, high } = resolveProgressivePair(url);
    const lowUrl = low ?? url;
    return { low: lowUrl, high: high ?? lowUrl, highReady: false };
  });

  useEffect(() => {
    const { low, high } = resolveProgressivePair(url);
    const lowUrl = low ?? url;
    const highUrl = high ?? lowUrl;
    if (!high || high === low) {
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      setState({ low: lowUrl, high: highUrl, highReady: true });
    };
    img.src = high;

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
