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
      storySort: (a, b) => {
        const topNames = ['Overview', 'Full Instrument Assembly'];
        const aTop = topNames.indexOf(a.name);
        const bTop = topNames.indexOf(b.name);
        if (aTop !== -1 && bTop !== -1) return aTop - bTop;
        if (aTop !== -1) return -1;
        if (bTop !== -1) return 1;
        return a.id.localeCompare(b.id, undefined, { numeric: true });
      }
    },
    a11y: {
      test: 'todo'
    }
  },
};

export default preview;
