import type { Meta, StoryObj } from '@storybook/react-vite';
import { CanonLayerItem } from './CanonLayerItem';
import type { FocusedCanonAnnotation } from '../../../services/details/types';
import storyStyles from '../domainStories.module.css';

const fictionalWithSubtitle: FocusedCanonAnnotation = {
  layerId: 'layer-project-hail-mary',
  layerTitle: 'Project Hail Mary',
  layerHref: '/galaxy?select=layer:project-hail-mary&layer=project-hail-mary',
  href: '/system/40-eridani?select=layer:project-hail-mary&layer=project-hail-mary:erid',
  kind: 'fictional-canon',
  targetId: 'erid',
  targetType: 'planet',
  inUniverseName: 'Erid',
  subtitle: '40 Eridani System',
  text: 'Homeworld of the Eridians.',
};

const scientificOverlay: FocusedCanonAnnotation = {
  layerId: 'overlay-recent-discoveries',
  layerTitle: 'Recent Discoveries',
  layerHref: '/galaxy?select=layer:recent-discoveries&layer=recent-discoveries',
  href: '/system/lhs-1140?focus=lhs-1140-b&select=layer:recent-discoveries&layer=recent-discoveries:lhs-1140-b',
  kind: 'scientific-overlay',
  targetId: 'lhs-1140-b',
  targetType: 'planet',
  resolvedName: 'LHS 1140 b',
  subtitle: 'Temperate Rocky World',
  text: 'JWST atmosphere candidate exoplanet.',
};

const simpleAnnotation: FocusedCanonAnnotation = {
  layerId: 'hard-scifi',
  layerTitle: 'Hard Sci-Fi Canon',
  layerHref: '/galaxy?select=layer:hard-scifi&layer=hard-scifi',
  href: '/galaxy?focus=tau-ceti&select=layer:hard-scifi&layer=hard-scifi:tau-ceti',
  kind: 'fictional-canon',
  targetId: 'tau-ceti',
  targetType: 'system',
  inUniverseName: 'Tau Ceti',
  text: 'Astrophage destination star system.',
};

const meta: Meta<typeof CanonLayerItem> = {
  title: 'DOMAIN/Panels/CanonLayerItem',
  component: CanonLayerItem,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className={storyStyles.panelContainer} style={{ width: 360 }}>
        <ul style={{ margin: 0, padding: 0 }}>
          <Story />
        </ul>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CanonLayerItem>;

export const FictionalWithSubtitle: Story = {
  args: {
    annotation: fictionalWithSubtitle,
  },
};

export const ScientificOverlayItem: Story = {
  args: {
    annotation: scientificOverlay,
  },
};

export const WithoutSubtitle: Story = {
  args: {
    annotation: simpleAnnotation,
  },
};
