import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value to a new target whenever
 * `value` changes. Purely a presentation aid — never alters the value
 * itself, only how it's revealed over `durationMs`.
 */
export function useCountUp(value, durationMs = 600) {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef(null);
  const fromRef = useRef(value);

  useEffect(() => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const to = value;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return display;
}