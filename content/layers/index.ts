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
import canonClassicScifi from './canon-classic-scifi';
import overlayInterstellarMissions from './overlay-interstellar-missions';
import overlayRecentDiscoveries from './overlay-recent-discoveries';
import overlayJwstTargets from './overlay-jwst-targets';
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
  canonClassicScifi,
  overlayInterstellarMissions,
  overlayRecentDiscoveries,
  overlayJwstTargets,
  overlayExtremeWorlds,
];
