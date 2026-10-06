import type { Preview } from '@storybook/react-vite';
import '../src/components/poc/canvas/patchR3F';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    options: {
      storySort: (a: any, b: any) => {
        if (a.name === 'Overview') return -1;
        if (b.name === 'Overview') return 1;
        return a.id.localeCompare(b.id, undefined, { numeric: true });
      }
    },
    a11y: {
      test: 'todo'
    }
  },
};

export default preview;
