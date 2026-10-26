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
import canonBabylon5 from './canon-babylon-5';
import canonKnownSpace from './canon-known-space';
import canonAllianceUnion from './canon-alliance-union';
import canonKsrSolar from './canon-ksr-solar';
import canonWeirSolar from './canon-weir-solar';
import canonClarkeDeepSpace from './canon-clarke-deep-space';
import canonMassEffect from './canon-mass-effect';
import canonStarfield from './canon-starfield';
import canonCowboyBebop from './canon-cowboy-bebop';
import canonWanderingEarth from './canon-wandering-earth';
import canonForeverWar from './canon-forever-war';
import canonOldMansWar from './canon-old-mans-war';
import canonEndersGame from './canon-enders-game';
import canonInterstellar from './canon-interstellar';
import canonForAllMankind from './canon-for-all-mankind';
import canonHeinlein from './canon-heinlein';
import canonHamilton from './canon-hamilton';
import canonGregEgan from './canon-greg-egan';
import canonStephenBaxter from './canon-stephen-baxter';
import canonReynoldsStandalone from './canon-reynolds-standalone';
import canonHardSfBenchmarks from './canon-hard-sf-benchmarks';
import canonFrontlines from './canon-frontlines';
import canonNivenPournelle from './canon-niven-pournelle';
import canonPosthumanSolar from './canon-posthuman-solar';
import canonGoldenAgeSol from './canon-golden-age-sol';
import canonPkdWorlds from './canon-pkd-worlds';
import canonClassicPioneers from './canon-classic-pioneers';
import canonBenfordBrin from './canon-benford-brin';
import canonStephensonMcdevitt from './canon-stephenson-mcdevitt';
import canonSciFiCinema from './canon-sci-fi-cinema';
import canonSpaceTelevision from './canon-space-television';
import canonSpaceAnime from './canon-space-anime';
import canonGamingLandmarks from './canon-gaming-landmarks';
import overlayInterstellarProbes from './overlay-interstellar-probes';
import overlaySetiLandmarks from './overlay-seti-landmarks';
import overlaySolarLandmarks from './overlay-solar-landmarks';
import overlayJwstTargets from './overlay-jwst-targets';
import overlayHabitableWorlds from './overlay-habitable-worlds';
import overlayRecentDiscoveries from './overlay-recent-discoveries';
import overlayExtremeWorlds from './overlay-extreme-worlds';
import { CONSTELLATION_LAYER_MANIFESTS } from './overlay-constellations';

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
  canonBabylon5,
  canonKnownSpace,
  canonAllianceUnion,
  canonKsrSolar,
  canonWeirSolar,
  canonClarkeDeepSpace,
  canonMassEffect,
  canonStarfield,
  canonCowboyBebop,
  canonWanderingEarth,
  canonForeverWar,
  canonOldMansWar,
  canonEndersGame,
  canonInterstellar,
  canonForAllMankind,
  canonHeinlein,
  canonHamilton,
  canonGregEgan,
  canonStephenBaxter,
  canonReynoldsStandalone,
  canonHardSfBenchmarks,
  canonFrontlines,
  canonNivenPournelle,
  canonPosthumanSolar,
  canonGoldenAgeSol,
  canonPkdWorlds,
  canonClassicPioneers,
  canonBenfordBrin,
  canonStephensonMcdevitt,
  canonSciFiCinema,
  canonSpaceTelevision,
  canonSpaceAnime,
  canonGamingLandmarks,
  overlayInterstellarProbes,
  overlaySetiLandmarks,
  overlaySolarLandmarks,
  overlayJwstTargets,
  overlayHabitableWorlds,
  overlayRecentDiscoveries,
  overlayExtremeWorlds,
  ...CONSTELLATION_LAYER_MANIFESTS,
];
