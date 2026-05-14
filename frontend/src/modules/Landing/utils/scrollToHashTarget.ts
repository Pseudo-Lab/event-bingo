export const scrollToHashTarget = (hash: string) => {
  if (typeof document === "undefined") {
    return false;
  }

  const target = document.querySelector(hash);
  if (!target) {
    return false;
  }

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const targetTop = target.getBoundingClientRect().top + window.scrollY;

  if (prefersReducedMotion) {
    window.scrollTo({ top: targetTop });
  } else {
    const startTop = window.scrollY;
    const distance = targetTop - startTop;
    const duration = 650;
    const startTime = window.performance.now();
    const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo({ top: startTop + distance * easeOutCubic(progress) });

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }

  if (typeof window !== "undefined") {
    window.setTimeout(
      () => window.history.replaceState(null, "", hash),
      prefersReducedMotion ? 0 : 650
    );
  }

  return true;
};
