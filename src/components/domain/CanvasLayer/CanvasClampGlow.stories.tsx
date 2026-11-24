import type { Meta, StoryObj } from '@storybook/react-vite';
import { ALL_CANVAS_CLAMP_EDGES, useCameraStore } from '../../../stores/useCameraStore';
import { Button } from '../../interface/controls/Button';
import { CanvasClampGlow } from './CanvasClampGlow';

const meta: Meta<typeof CanvasClampGlow> = {
  title: 'DOMAIN/CanvasClampGlow',
  component: CanvasClampGlow,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CanvasClampGlow>;

export const Interactive: Story = {
  render: () => (
    <div>
      <CanvasClampGlow />
      <div>
        <Button
          size="sm"
          onClick={() => useCameraStore.getState().triggerClampBump(ALL_CANVAS_CLAMP_EDGES, 'zoom-out')}
        >
          Bump Zoom-Out Ceiling (All Edges)
        </Button>
        <Button
          size="sm"
          onClick={() => useCameraStore.getState().triggerClampBump(['right'], 'pan')}
        >
          Bump Right Edge (Pan)
        </Button>
      </div>
    </div>
  ),
};
