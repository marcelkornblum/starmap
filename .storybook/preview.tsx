import type { Preview } from '@storybook/react-vite';
import '../src/components/canvas/patchR3F';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: [
          'Canvas',
          [
            'Production Scenes',
            ['Spatial Viewport', 'Canonical Scenes'],
            'Celestial Entities',
            ['Celestial Entity', 'Planet Body'],
            'Cartographic Instrument',
            ['Cartographic Instrument'],
            'Prototypes & Verification',
            ['Spatial Scenes (Multi-Scale & UI PoC)'],
          ],
          'Surfaces',
          'Overlays',
          'Primitives',
          'Templates',
          'Domain',
        ],
      },
    },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;