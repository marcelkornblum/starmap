import type { DatasetLayerManifest } from '../../src/types/astro';
import canonProjectHailMary from './canon-project-hail-mary';
import canonStarTrek from './canon-star-trek';
import canonThreeBody from './canon-three-body';
import canonHalo from './canon-halo';
import canonDune from './canon-dune';
import canonAvatar from './canon-avatar';
import canonTheExpanse from './canon-the-expanse';
import canonBobiverse from './canon-bobiverse';
import canonRevelationSpace from './canon-revelation-space';
import canonHitchhikersGuide from './canon-hitchhikers-guide';
import canonSpaceOdyssey from './canon-space-odyssey';
import canonAlien from './canon-alien';
import canonFoundation from './canon-foundation';
import canonHyperion from './canon-hyperion';
import canonContact from './canon-contact';
import canonAurora from './canon-aurora';
import canonForbiddenPlanet from './canon-forbidden-planet';
import canonTheDispossessed from './canon-the-dispossessed';
import overlayInterstellarProbes from './overlay-interstellar-probes';
import overlaySetiLandmarks from './overlay-seti-landmarks';
import overlaySolarLandmarks from './overlay-solar-landmarks';
import overlayJwstTargets from './overlay-jwst-targets';
import overlayHabitableWorlds from './overlay-habitable-worlds';
import overlayRecentDiscoveries from './overlay-recent-discoveries';
import overlayExtremeWorlds from './overlay-extreme-worlds';

export const LAYER_MANIFESTS: readonly DatasetLayerManifest[] = [
  canonProjectHailMary,
  canonStarTrek,
  canonThreeBody,
  canonHalo,
  canonDune,
  canonAvatar,
  canonTheExpanse,
  canonBobiverse,
  canonRevelationSpace,
  canonHitchhikersGuide,
  canonSpaceOdyssey,
  canonAlien,
  canonFoundation,
  canonHyperion,
  canonContact,
  canonAurora,
  canonForbiddenPlanet,
  canonTheDispossessed,
  overlayInterstellarProbes,
  overlaySetiLandmarks,
  overlaySolarLandmarks,
  overlayJwstTargets,
  overlayHabitableWorlds,
  overlayRecentDiscoveries,
  overlayExtremeWorlds,
];
