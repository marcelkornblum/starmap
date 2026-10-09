import type { Preview } from '@storybook/react-vite';
import '../src/components/canvas/viewport/patchR3F';
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
        const [aCategory, aSubcategory] = a.title.split('/');
        const [bCategory, bSubcategory] = b.title.split('/');

        const categoryOrder = ['INTERFACE', 'CANVAS', 'PROTOTYPES', 'POC'];
        const aCatIdx = categoryOrder.indexOf(aCategory);
        const bCatIdx = categoryOrder.indexOf(bCategory);

        if (aCatIdx !== -1 && bCatIdx !== -1 && aCatIdx !== bCatIdx) {
          return aCatIdx - bCatIdx;
        }
        if (aCatIdx !== -1 && bCatIdx === -1) return -1;
        if (bCatIdx !== -1 && aCatIdx === -1) return 1;

        // In INTERFACE: Controls -> Information -> Surfaces -> Layouts
        if (aCategory === 'INTERFACE' && bCategory === 'INTERFACE') {
          const interfaceSubOrder = ['Controls', 'Information', 'Surfaces', 'Layouts'];
          const aSubIdx = interfaceSubOrder.indexOf(aSubcategory);
          const bSubIdx = interfaceSubOrder.indexOf(bSubcategory);
          if (aSubIdx !== -1 && bSubIdx !== -1 && aSubIdx !== bSubIdx) {
            return aSubIdx - bSubIdx;
          }
          if (aSubIdx !== -1 && bSubIdx === -1) return -1;
          if (bSubIdx !== -1 && aSubIdx === -1) return 1;
        }

        // In CANVAS
        if (aCategory === 'CANVAS' && bCategory === 'CANVAS') {
          const canvasSubOrder = ['Overview', 'Assembly', 'Viewport', 'Instrument', 'Entities', 'Scenes'];
          const aSubIdx = canvasSubOrder.indexOf(aSubcategory);
          const bSubIdx = canvasSubOrder.indexOf(bSubcategory);
          if (aSubIdx !== -1 && bSubIdx !== -1 && aSubIdx !== bSubIdx) {
            return aSubIdx - bSubIdx;
          }
        }

        // In PROTOTYPES
        if (aCategory === 'PROTOTYPES' && bCategory === 'PROTOTYPES') {
          const protoSubOrder = ['Typography Review', 'Colour Palette', 'Full UI'];
          const aSubIdx = protoSubOrder.indexOf(aSubcategory);
          const bSubIdx = protoSubOrder.indexOf(bSubcategory);
          if (aSubIdx !== -1 && bSubIdx !== -1 && aSubIdx !== bSubIdx) {
            return aSubIdx - bSubIdx;
          }
        }

        if (a.title !== b.title) {
          return a.title.localeCompare(b.title);
        }

        const topNames = [
          'Overview',
          'Typography',
          'Elevations & Spatial Hierarchy',
          'Surface Gallery',
          'Multi-Scale Navigator',
          'Full Assembly',
          'Full Canvas Assembly',
          'Full Instrument Assembly',
          'Full Entity Assembly',
          'Reticle Taxonomy & Facets',
          'Planetary Bodies & Reticle Cross-fade',
        ];
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
