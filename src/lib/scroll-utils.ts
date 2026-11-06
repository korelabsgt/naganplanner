export function smoothScrollToElement(
  element: HTMLElement | null,
  offset = 80,
  duration = 450
) {
  if (!element || typeof window === "undefined") return;

  const rect = element.getBoundingClientRect();
  const startY = window.pageYOffset || document.documentElement.scrollTop;
  const targetY = Math.max(0, rect.top + startY - offset);
  const distance = targetY - startY;

  // Si ya estamos prácticamente en la posición, no hace falta animar
  if (Math.abs(distance) < 15) return;

  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Curva de aceleración/desaceleración suave (Cubic Ease In-Out)
    const ease =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    window.scrollTo(0, startY + distance * ease);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}
