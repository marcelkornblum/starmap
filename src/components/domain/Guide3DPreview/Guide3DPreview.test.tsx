// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Guide3DPreview } from './Guide3DPreview';

describe('<Guide3DPreview />', () => {
  it('renders star preview with spectral attributes', () => {
    render(
      <Guide3DPreview
        kind="star"
        spectralClass="G2V"
        spectralLetter="G"
        luminosityClass="V"
        radiusRsun={1.0}
        tempK={5778}
        chromaticityHex="#fff4ea"
        isDetail
      />
    );

    const preview = screen.getByTestId('guide-3d-preview');
    expect(preview.getAttribute('data-preview-kind')).toBe('star');
    expect(preview.getAttribute('data-detail')).toBe('true');
    expect(preview.getAttribute('data-spectral-class')).toBe('G2V');
    expect(preview.getAttribute('data-radius-rsun')).toBe('1');
    expect(preview.getAttribute('data-chromaticity-hex')).toBe('#fff4ea');
  });

  it('renders planet preview with composition attributes', () => {
    render(
      <Guide3DPreview
        kind="planet"
        composition="terrestrial"
        radiusRearth={1.0}
        textureTheme="earth-like"
      />
    );

    const preview = screen.getByTestId('guide-3d-preview');
    expect(preview.getAttribute('data-preview-kind')).toBe('planet');
    expect(preview.getAttribute('data-composition')).toBe('terrestrial');
    expect(preview.getAttribute('data-texture-theme')).toBe('earth-like');
  });

  it('renders hazard preview with domain and severity attributes', () => {
    render(
      <Guide3DPreview
        kind="hazard"
        hazardId="supernova-remnant"
        domain="stellar"
        severity="critical"
      />
    );

    const preview = screen.getByTestId('guide-3d-preview');
    expect(preview.getAttribute('data-preview-kind')).toBe('hazard');
    expect(preview.getAttribute('data-hazard-id')).toBe('supernova-remnant');
    expect(preview.getAttribute('data-hazard-domain')).toBe('stellar');
    expect(preview.getAttribute('data-hazard-severity')).toBe('critical');
  });

  it('renders metric preview with baseline and target comparison stage', () => {
    render(
      <Guide3DPreview
        kind="metric"
        metricId="semi-major-axis"
        unit="AU"
        baselineName="Sol"
        baselineValue="1.0 AU"
        comparisonTarget="tau-ceti"
        targetName="Tau Ceti"
        targetValue="0.538 AU"
      />
    );

    const preview = screen.getByTestId('guide-3d-preview');
    expect(preview.getAttribute('data-preview-kind')).toBe('metric');
    expect(preview.getAttribute('data-metric-id')).toBe('semi-major-axis');
    expect(screen.getByText('Sol: 1.0 AU')).toBeDefined();
    expect(screen.getByText('Tau Ceti: 0.538 AU')).toBeDefined();
  });
});
