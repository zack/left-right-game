import { useComputedColorScheme } from '@mantine/core';
import { useEffect } from 'react';

// Keep the browser's toolbar color in step with the page.
const THEME_COLORS = { dark: '#16221f', light: '#dfe8e2' };

export default function ThemeColor() {
  const scheme = useComputedColorScheme('light');

  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[scheme]);
  }, [scheme]);

  return null;
}
