// Firefox for Android reports a page height (innerHeight, 100vh, 100dvh) that
// can be a few hundred pixels taller than what's actually on screen, which
// would push the bottom of the tap areas off the phone. visualViewport has
// the real number. Pinch zoom also changes it, so it's only read at normal
// scale.
export function trackVisibleHeight(): void {
  const viewport = globalThis.visualViewport;
  if (!viewport) {
    return;
  }
  function update() {
    if (viewport && viewport.scale === 1) {
      document.documentElement.style.setProperty(
        '--visible-height',
        `${viewport.height}px`,
      );
    }
  }
  viewport.addEventListener('resize', update);
  update();
}
