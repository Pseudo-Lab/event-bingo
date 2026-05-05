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

  target.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });

  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", hash);
  }

  return true;
};
