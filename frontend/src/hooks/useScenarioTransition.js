import { useEffect, useRef, useState } from "react";

export function useScenarioTransition(isLoading) {
  const [transitionClass, setTransitionClass] = useState("");
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    // First analysis uses the normal page reveal animation.
    if (!hasLoadedOnce.current) {
      if (!isLoading) {
        hasLoadedOnce.current = true;
      }

      return;
    }

    // Existing results fade slightly while a new scenario is loading.
    if (isLoading) {
      setTransitionClass("scenario-transition-out");
      return;
    }

    // New results animate back in.
    setTransitionClass("scenario-transition-in");

    const timer = setTimeout(() => {
      setTransitionClass("");
    }, 450);

    return () => clearTimeout(timer);
  }, [isLoading]);

  return transitionClass;
}