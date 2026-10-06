import { describe, it, expect, vi } from 'vitest';
import { createElement, type MouseEvent as ReactMouseEvent } from 'react';
import { renderToString } from 'react-dom/server';
import {
  ConfidencePip,
  normalizeConfidence,
  type ConfidenceLevel,
} from '../src/components/poc/primitives/data/ConfidencePip/ConfidencePip';

describe('Tier 1: Data Primitives - ConfidencePip', () => {
  describe('normalizeConfidence helper', () => {
    it('normalizes confirmed and high to confirmed', () => {
      expect(normalizeConfidence('confirmed')).toEqual({
        canonical: 'confirmed',
        defaultLabel: 'Confirmed',
      });
      expect(normalizeConfidence('high')).toEqual({
        canonical: 'confirmed',
        defaultLabel: 'Confirmed',
      });
    });

    it('normalizes candidate, medium, and moderate to candidate', () => {
      expect(normalizeConfidence('candidate')).toEqual({
        canonical: 'candidate',
        defaultLabel: 'Candidate',
      });
      expect(normalizeConfidence('medium')).toEqual({
        canonical: 'candidate',
        defaultLabel: 'Candidate',
      });
      expect(normalizeConfidence('moderate')).toEqual({
        canonical: 'candidate',
        defaultLabel: 'Candidate',
      });
    });

    it('normalizes theoretical, projected, and low to theoretical', () => {
      expect(normalizeConfidence('theoretical')).toEqual({
        canonical: 'theoretical',
        defaultLabel: 'Theoretical',
      });
      expect(normalizeConfidence('projected')).toEqual({
        canonical: 'theoretical',
        defaultLabel: 'Theoretical',
      });
      expect(normalizeConfidence('low')).toEqual({
        canonical: 'theoretical',
        defaultLabel: 'Theoretical',
      });
    });

    it('normalizes unverified to unverified', () => {
      expect(normalizeConfidence('unverified')).toEqual({
        canonical: 'unverified',
        defaultLabel: 'Unverified',
      });
    });
  });

  describe('Static & SSR Rendering', () => {
    it('renders small dot vertically centered in type row with correct data attributes', () => {
      const html = renderToString(
        createElement(ConfidencePip, { confidence: 'confirmed', size: 'md' })
      );
      expect(html).toContain('data-testid="confidence-pip-wrapper"');
      expect(html).toContain('data-confidence="confirmed"');
      expect(html).toContain('data-size="md"');
      expect(html).toContain('data-testid="confidence-pip-dot"');
      expect(html).toContain('aria-label="We have confirmed confidence in this data"');
      expect(html).toContain('aria-expanded="false"');
      // Tooltip is closed by default
      expect(html).not.toContain('data-testid="confidence-pip-tooltip"');
    });

    it('renders with open tooltip stating confidence level with coloured level name when defaultOpen is true', () => {
      const html = renderToString(
        createElement(ConfidencePip, {
          confidence: 'candidate',
          defaultOpen: true,
          details: 'Spectroscopic transit candidate',
        })
      );
      expect(html).toContain('data-testid="confidence-pip-tooltip"');
      expect(html).toContain('role="tooltip"');
      expect(html).toContain('We have');
      expect(html).toContain('confidence in this data');
      expect(html).toContain('data-testid="confidence-level-name"');
      expect(html).toContain('candidate');
      expect(html).toContain('data-confidence="candidate"');
      expect(html).toContain('Spectroscopic transit candidate');
    });

    it('renders all canonical levels with correct data-confidence attributes', () => {
      const levels: ConfidenceLevel[] = ['confirmed', 'candidate', 'theoretical', 'unverified'];
      for (const level of levels) {
        const html = renderToString(
          createElement(ConfidencePip, { confidence: level, defaultOpen: true })
        );
        expect(html).toContain(`data-confidence="${level}"`);
      }
    });

    it('supports custom label override and custom tooltip position', () => {
      const html = renderToString(
        createElement(ConfidencePip, {
          confidence: 'theoretical',
          label: 'Kinematic Projection',
          tooltipPosition: 'right',
          defaultOpen: true,
        })
      );
      expect(html).toContain('Kinematic Projection');
      expect(html).toContain('data-position="right"');
    });

    it('renders tooltip when controlled isOpen is true', () => {
      const htmlOpen = renderToString(
        createElement(ConfidencePip, {
          confidence: 'confirmed',
          isOpen: true,
          details: 'Astrometric lock',
        })
      );
      expect(htmlOpen).toContain('data-testid="confidence-pip-tooltip"');
      expect(htmlOpen).toContain('Astrometric lock');
      expect(htmlOpen).toContain('role="tooltip"');
      expect(htmlOpen).toContain('aria-expanded="true"');
    });
  });

  describe('Component Props & Action Handlers via React Harness', () => {
    it('handles button click and fires onClick and onOpenChange callbacks', () => {
      const handleClick = vi.fn();
      const handleOpenChange = vi.fn();
      let capturedEl: any;

      function Harness() {
        capturedEl = ConfidencePip({
          confidence: 'confirmed',
          onClick: handleClick,
          onOpenChange: handleOpenChange,
          defaultOpen: false,
        });
        return capturedEl;
      }

      renderToString(createElement(Harness));

      expect(capturedEl.props['data-confidence']).toBe('confirmed');
      const button = capturedEl.props.children[0];
      expect(button.props['aria-expanded']).toBe(false);

      // Simulate click on trigger button
      const dummyEvent = {} as ReactMouseEvent<HTMLButtonElement>;
      button.props.onClick(dummyEvent);

      expect(handleClick).toHaveBeenCalledWith(dummyEvent);
      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });

    it('adjusts position and alignment when near screen boundaries', () => {
      const html = renderToString(
        createElement(ConfidencePip, {
          confidence: 'confirmed',
          defaultOpen: true,
          tooltipPosition: 'top',
        })
      );
      expect(html).toContain('data-testid="confidence-pip-tooltip"');
      expect(html).toContain('data-align="center"');
    });
  });
});

