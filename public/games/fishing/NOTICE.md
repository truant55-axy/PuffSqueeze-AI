# PuffSqueeze · Quiet Cove Fishing

Adapted from Fishing Game by jm-wltr:
https://github.com/jm-wltr/fishing-game

Pinned upstream commit: 9ccb03995c560a27283a031e7f70ec06147a99fe
Upstream license: Apache License 2.0. A complete copy is included in LICENSE.
The original README is retained as UPSTREAM-README.md.

Modified for PuffSqueeze on 2026-10-15:
- Extracted and adapted Fish.draw's Bezier body, hinged tail and eye, Fish.setTarget's steering, friction / smooth rotation / tail movement, and getWaterHeight's three-sine water texture into TypeScript modules.
- Replaced the overhead bobber and timed bite / reeling bar with a side-view hold-to-lower / release-to-retrieve fishing loop and swept catch collision.
- Replaced global canvas / DOM state with a disposable React-hosted engine, frame-independent updates, resize handling, pause and reduced-motion support.
- Added pastel species, depth zones, a local collection, bilingual UI and the existing PuffSqueeze companion renderer.
- Added keyboard / touch / pointer input and optional continuous JSON pressure input over Web Serial.
- Omitted upstream audio. New optional catch audio is synthesized locally and disposed on exit.

The current engine and screen contain substantial original PuffSqueeze code in addition to the adapted portions. Original companion artwork and its existing project attribution remain separate from this upstream game.

Further PuffSqueeze visual changes (2026-10-15): replaced the shared fish silhouette with ten original species-specific vector designs, including fins, tails, spots and stripes. Canvas and journal SVGs share the artwork data in fishArtwork.ts. The hinged-tail animation, steering and water texture retain their upstream-derived implementation; the new vector artwork is original to PuffSqueeze. Existing collection IDs remain compatible.

Gameplay presentation update (2026-10-15): reduced the fish population to six, increased speed, staggered entries and added per-fish pacing. Replaced the dashboard layout with a viewport-sized playfield, in-scene controls, catch bubbles, collection / score feedback, optional fullscreen and paused journal / settings dialogs. No additional third-party assets or packages were introduced.
