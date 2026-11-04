import '@mantine/core/styles/baseline.css';
import '@mantine/core/styles/default-css-variables.css';
import '@mantine/core/styles/global.css';
import '@mantine/core/styles/UnstyledButton.css';
import '@mantine/core/styles/Button.css';
import '@mantine/core/styles/InlineInput.css';
import '@mantine/core/styles/SegmentedControl.css';
import '@mantine/core/styles/Switch.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';

// Needs to go after the Mantine CSS imports
import './app.css';

import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import { StrictMode } from 'react';
import ThemeColor from './ThemeColor.tsx';
import { createRoot } from 'react-dom/client';
import { trackVisibleHeight } from './visibleHeight.ts';
import {
  MantineProvider,
  createTheme,
  localStorageColorSchemeManager,
} from '@mantine/core';

// The inline script in index.html reads the same key before first paint.
const THEME_KEY = 'left-right-theme';

const theme = createTheme({
  fontFamily: "'Archivo', sans-serif",
  headings: { fontFamily: "'Archivo', sans-serif" },
});

const root = document.getElementById('root');
if (!root) {
  throw Error('Missing #root element in index.html.');
}

trackVisibleHeight();

createRoot(root).render(
  <StrictMode>
    <MantineProvider
      colorSchemeManager={localStorageColorSchemeManager({ key: THEME_KEY })}
      defaultColorScheme='auto'
      theme={theme}
    >
      <ThemeColor />
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </MantineProvider>
    <Analytics />
  </StrictMode>,
);
