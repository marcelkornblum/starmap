import type { Meta, StoryObj } from '@storybook/react-vite';
import { DetentSheet } from './DetentSheet';

const meta: Meta<typeof DetentSheet> = {
  title: 'SURFACES/DetentSheet',
  component: DetentSheet,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DetentSheet>;

export const PeekDetentStory: Story = {
  name: 'Peek Detent',
  args: {
    testIdPrefix: 'example',
    heading: 'Target Telemetry',
    activeDetent: 'peek',
    peek: (
      <div>
        <strong>Sol</strong> [G2V] · 8 planets · 0 hazards
      </div>
    ),
  },
};

export const PartialDetentStory: Story = {
  name: 'Partial Detent',
  args: {
    testIdPrefix: 'example',
    heading: 'Target Telemetry',
    activeDetent: 'partial',
    peek: (
      <div>
        <strong>Sol</strong> [G2V] · 8 planets · 0 hazards
      </div>
    ),
    partial: (
      <div>
        <p>Available actions: Details, Centre, Directions</p>
        <p>System components: 1 star, 8 confirmed planets</p>
      </div>
    ),
  },
};

export const FullDetentStory: Story = {
  name: 'Full Detent',
  args: {
    testIdPrefix: 'example',
    heading: 'Target Telemetry',
    activeDetent: 'full',
    peek: (
      <div>
        <strong>Sol</strong> [G2V] · 8 planets · 0 hazards
      </div>
    ),
    partial: (
      <div>
        <p>Available actions: Details, Centre, Directions</p>
        <p>System components: 1 star, 8 confirmed planets</p>
      </div>
    ),
    full: (
      <dl>
        <dt>Coordinates</dt>
        <dd>[0.00, 0.00, 0.00] pc</dd>
        <dt>Sector</dt>
        <dd>sector_+000_+000_+000</dd>
      </dl>
    ),
  },
};
