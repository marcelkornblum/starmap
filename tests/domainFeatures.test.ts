import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  OrbitTable,
  StarDossier,
  CommandPalette,
  SystemControls,
  type OrbitElementRow,
  type StarDossierData,
  type CommandPaletteItem,
} from '../src/components/domain';

describe('Tier 4: Domain Features', () => {
  describe('OrbitTable', () => {
    const sampleOrbits: OrbitElementRow[] = [
      {
        id: 'earth',
        name: 'Earth',
        semiMajorAxis: 1.0,
        eccentricity: 0.0167,
        inclination: 0.0,
        periodDays: 365.25,
      },
      {
        id: 'jupiter',
        name: 'Jupiter',
        semiMajorAxis: 5.204,
        eccentricity: 0.0489,
        inclination: 1.3,
        periodDays: 4332.59,
      },
    ];

    it('renders telemetry table with tabular numerals and headers', () => {
      const html = renderToString(
        createElement(OrbitTable, {
          orbits: sampleOrbits,
          selectedId: 'earth',
        })
      );
      expect(html).toContain('Earth');
      expect(html).toContain('Jupiter');
      expect(html).toContain('1.000');
      expect(html).toContain('0.0167');
      expect(html).toContain('365.3');
      expect(html).toContain('11.86');
      expect(html).toContain('>AU</span>');
      expect(html).toContain('>°</span>');
      expect(html).toContain('>d</span>');
      expect(html).toContain('>y</span>');
      expect(html).not.toContain('(AU)');
      expect(html).not.toContain('(°)');
      expect(html).not.toContain('(d)');
      expect(html).toContain('data-selected="true"');
    });

    it('renders empty notice when no orbital records exist', () => {
      const html = renderToString(createElement(OrbitTable, { orbits: [] }));
      expect(html).toContain('No orbital telemetry records available.');
    });

    it('renders em-dash fallback for invalid or non-positive orbital period and NaN elements', () => {
      const html = renderToString(
        createElement(OrbitTable, {
          orbits: [
            {
              id: 'anomaly',
              name: 'Anomaly',
              semiMajorAxis: Number.NaN,
              eccentricity: Number.NaN,
              inclination: Number.NaN,
              periodDays: -1,
            },
          ],
        })
      );
      expect(html).toContain('—');
    });

    it('handles row selection via click and keyboard events', () => {
      const handleSelect = vi.fn();
      let tableEl: any;
      function TableHarness() {
        tableEl = OrbitTable({
          orbits: sampleOrbits,
          onSelect: handleSelect,
        });
        return tableEl;
      }
      renderToString(createElement(TableHarness));

      // tbody > tr rows
      const tbody = tableEl.props.children.props.children[2];
      const firstRow = tbody.props.children[0];

      // Click
      firstRow.props.onClick?.();
      expect(handleSelect).toHaveBeenCalledWith('earth');

      // Enter key
      firstRow.props.onKeyDown?.({ key: 'Enter', preventDefault: vi.fn() });
      expect(handleSelect).toHaveBeenCalledWith('earth');

      // Space key
      firstRow.props.onKeyDown?.({ key: ' ', preventDefault: vi.fn() });
      expect(handleSelect).toHaveBeenCalledWith('earth');
    });
  });

  describe('StarDossier', () => {
    const mockStar: StarDossierData = {
      id: 'sol',
      name: 'Sol',
      properName: 'Sun',
      spectralType: 'G2V',
      luminosityLsun: 1.0,
      massMsun: 1.0,
      effectiveTempK: 5778,
      distPc: 0.0,
      con: 'None',
      overviewText: 'Central star of the Solar System.',
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          letter: 'd',
          massMearth: 1.0,
          orbit: {
            semiMajorAxis: 1.0,
            eccentricity: 0.0167,
            inclination: 0.0,
            periodDays: 365.25,
            ascendingNode: 0.0,
            argumentOfPeriapsis: 114.2,
            meanAnomaly: 358.6,
          },
        },
      ],
    };

    it('renders dossier layout with habitable zone calculations and planet inventory', () => {
      const html = renderToString(
        createElement(StarDossier, {
          star: mockStar,
        })
      );
      expect(html).toContain('Sun');
      expect(html).toContain('(Sol)');
      expect(html).toContain('G2V');
      expect(html).toContain('0.95–1.37 AU'); // HZ for 1.0 Lsun
      expect(html).toContain('Central star of the Solar System.');
      expect(html).toContain('Earth');
      expect(html).toContain('Habitable Zone');
    });

    it('renders empty notice when star has no exoplanets', () => {
      const html = renderToString(
        createElement(StarDossier, {
          star: {
            id: 'vega',
            name: 'Vega',
            spectralType: 'A0V',
            luminosityLsun: 40.0,
            distPc: 7.68,
            planets: [],
          },
        })
      );
      expect(html).toContain('No confirmed exoplanets cataloged in this system.');
    });

    it('guards against negative or missing luminosity without rendering NaN or false Sol baseline', () => {
      const html = renderToString(
        createElement(StarDossier, {
          star: {
            id: 'anomalous',
            name: 'Anomalous Star',
            luminosityLsun: -5.0,
            distPc: -10,
          },
        })
      );
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('0.95–1.37 AU');
      expect(html).toContain('Distance unknown');
    });

    it('handles interactive callbacks for close, navigate, and planet selection', () => {
      const handleClose = vi.fn();
      const handleNavigate = vi.fn();
      const handleSelectPlanet = vi.fn();

      let dossierEl: any;
      function DossierHarness() {
        dossierEl = StarDossier({
          star: mockStar,
          onClose: handleClose,
          onNavigateSystem: handleNavigate,
          onSelectPlanet: handleSelectPlanet,
        });
        return dossierEl;
      }
      renderToString(createElement(DossierHarness));

      const dossierLayout = dossierEl.props.children;
      // Header close button
      const closeBtn = dossierLayout.props.header.props.children[1];
      closeBtn.props.onClick?.();
      expect(handleClose).toHaveBeenCalled();

      // Action button
      const actionBtn = dossierLayout.props.actions.props.children;
      actionBtn.props.onClick?.();
      expect(handleNavigate).toHaveBeenCalledWith('sol');
    });
  });

  describe('CommandPalette', () => {
    const sampleItems: CommandPaletteItem[] = [
      { id: 'sol', title: 'Sol System', category: 'system', badge: 'Primary' },
      { id: 'earth', title: 'Earth', category: 'planet' },
      { id: 'alpha-cen', title: 'Alpha Centauri', category: 'system' },
    ];

    it('renders modal dialog with command palette items and keyboard hints', () => {
      const html = renderToString(
        createElement(CommandPalette, {
          isOpen: true,
          onClose: vi.fn(),
          items: sampleItems,
        })
      );
      expect(html).toContain('Atlas Command Palette');
      expect(html).toContain('Sol System');
      expect(html).toContain('Earth');
      expect(html).toContain('Alpha Centauri');
      expect(html).toContain('Primary');
      expect(html).toContain('Navigate with');
    });

    it('renders empty search notice when no items match', () => {
      const html = renderToString(
        createElement(CommandPalette, {
          isOpen: true,
          onClose: vi.fn(),
          items: [],
        })
      );
      expect(html).toContain('No celestial entities or coordinates match your query.');
    });

    it('handles item selection and onClose callback', () => {
      const handleClose = vi.fn();
      const handleSelect = vi.fn();
      const itemAction = vi.fn();

      const itemsWithAction: CommandPaletteItem[] = [
        { id: 'sol', title: 'Sol', category: 'system', onSelect: itemAction },
      ];

      let paletteEl: any;
      function PaletteHarness() {
        paletteEl = CommandPalette({
          isOpen: true,
          onClose: handleClose,
          items: itemsWithAction,
          onSelectItem: handleSelect,
        });
        return paletteEl;
      }
      renderToString(createElement(PaletteHarness));

      // The modal's children contain <CommandPaletteContent ... />
      const modalContentElement = paletteEl.props.children;
      let contentEl: any;
      function ContentHarness() {
        contentEl = modalContentElement.type(modalContentElement.props);
        return contentEl;
      }
      renderToString(createElement(ContentHarness));

      const ul = contentEl.props.children[1];
      const firstLi = ul.props.children[0];

      firstLi.props.onClick?.();
      expect(itemAction).toHaveBeenCalled();
      expect(handleSelect).toHaveBeenCalledWith(itemsWithAction[0]);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('SystemControls', () => {
    it('renders HUD controls with play button, warp slider, projection buttons, and toggles', () => {
      const html = renderToString(
        createElement(SystemControls, {
          showOrbits: true,
          showGrid: false,
          showLabels: true,
          isPlaying: true,
          timeSpeed: 10,
          projection: '3d',
        })
      );
      expect(html).toContain('⏸ Pause');
      expect(html).toContain('Warp');
      expect(html).toContain('3D');
      expect(html).toContain('Top-Down');
      expect(html).toContain('Orbits');
      expect(html).toContain('Grid');
      expect(html).toContain('Labels');
    });

    it('triggers action handlers for play toggle, projection, and settings toggles', () => {
      const handleTogglePlay = vi.fn();
      const handleTimeSpeed = vi.fn();
      const handleToggleOrbits = vi.fn();
      const handleToggleGrid = vi.fn();
      const handleToggleLabels = vi.fn();
      const handleProjection = vi.fn();
      const handleReset = vi.fn();

      let controlsEl: any;
      function ControlsHarness() {
        controlsEl = SystemControls({
          isPlaying: false,
          onTogglePlay: handleTogglePlay,
          timeSpeed: 5,
          onTimeSpeedChange: handleTimeSpeed,
          showOrbits: false,
          onToggleOrbits: handleToggleOrbits,
          showGrid: true,
          onToggleGrid: handleToggleGrid,
          showLabels: true,
          onToggleLabels: handleToggleLabels,
          projection: '3d',
          onProjectionChange: handleProjection,
          onResetView: handleReset,
        });
        return controlsEl;
      }
      renderToString(createElement(ControlsHarness));

      const stackChildren = controlsEl.props.children.props.children;
      const topCluster = stackChildren[0].props.children;
      const leftCluster = topCluster[0].props.children;
      const rightCluster = topCluster[1].props.children;
      const bottomCluster = stackChildren[1].props.children;

      // Play toggle
      const playBtn = leftCluster[0];
      playBtn.props.onClick?.();
      expect(handleTogglePlay).toHaveBeenCalled();

      // Projection buttons
      const buttonGroup = rightCluster[0].props.children;
      const topDownBtn = buttonGroup[1];
      topDownBtn.props.onClick?.();
      expect(handleProjection).toHaveBeenCalledWith('top-down');

      // Reset view button
      const resetBtn = rightCluster[1];
      resetBtn.props.onClick?.();
      expect(handleReset).toHaveBeenCalled();

      // Orbits toggle
      const orbitsToggle = bottomCluster[0];
      orbitsToggle.props.onChange?.(true);
      expect(handleToggleOrbits).toHaveBeenCalledWith(true);

      // Grid toggle
      const gridToggle = bottomCluster[1];
      gridToggle.props.onChange?.(false);
      expect(handleToggleGrid).toHaveBeenCalledWith(false);

      // Labels toggle
      const labelsToggle = bottomCluster[2];
      labelsToggle.props.onChange?.(false);
      expect(handleToggleLabels).toHaveBeenCalledWith(false);
    });
  });
});
