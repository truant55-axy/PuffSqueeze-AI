# The Aviator — PuffSqueeze adaptation

Original game: **The Aviator**, Karim Maaloul / Codrops, 2016.

- Source: https://github.com/yakudoo/TheAviator
- Pinned source commit: `d19b8744e745f74fb70b4f255d700394aa6b3200`
- Original tutorial: https://tympanus.net/codrops/?p=26501
- Original demo: https://tympanus.net/Tutorials/TheAviator/
- Original README is retained alongside this file.

## Permission and attribution

The source README permits free integration and building upon the work for personal or commercial projects, with a restriction on republishing, redistributing or selling it “as-is”. This is a modified integration, with new controls, UI, pause behavior, localization and particle animation. We retain the original source attribution and these terms rather than representing the original repository as an unrestricted MIT release.

Codrops' current downloadable-demo licensing page also states MIT unless specifically noted otherwise: https://tympanus.net/codrops/licensing/ (consulted 2026-10-15). The original repository's more specific README is preserved.

The bundled original Three.js renderer is copyright its respective contributors and uses the MIT license; see `THREE-LICENSE.txt`. Its original source header is retained. The original TweenMax dependency is not included or used: particle effects were replaced with a small frame-based implementation that pauses with the game. All models are constructed procedurally by the original game; no outside models, fonts, photos or audio are loaded.

## PuffSqueeze modifications

- Added a local game page and entry from the existing React game screen.
- Single player: **ArrowLeft = ascend**, **ArrowRight = descend**; holding moves, releasing holds the selected altitude. Horizontal flight speed is automatic.
- Either direction key starts, resumes or replays. Both direction keys together pause, with a release latch to avoid repeated toggling. On-screen equivalents support pointer input.
- Removed mouse-position steering; fixed horizontal plane position and camera height to make vertical motion visible.
- Added pause on focus loss / hidden page, time-step clamping, safe replay cleanup, bilingual instructions and a WebGL error state.
- Preserved the sea, clouds, plane, collectibles, energy, obstacles and journey progression. Reduced speed/energy pressure and removed the original flashing low-energy indicator / bright collision flash.
- Capped obstacle batches, render pixel ratio and shadow-map size. All runtime scripts are local; gameplay makes no network requests and sends no care XP or hardware telemetry.
- Real independent left/right pressure-handle input is not connected by this adaptation. Keyboard input works without a device connection.

### Difficulty adjustment, 2026-10-16

- Increased starting flight speed by 24%, with a higher speed cap and faster progression every 800 metres.
- Increased obstacle waves from 1–4 to 2–5 obstacles, and reduced the distance between waves from 50 to 40 metres.
- Increased obstacle approach speed and stagger spacing together; increased vertical movement speed from 105 to 120 world units per second to support dodging.
- Left/right controls, collision tolerance and energy rewards/damage retain their existing behavior. No gameplay tests were run for this adjustment.

Changed files: `index.html`, `aviator.css`, `js/controls.js`, `js/game.js`, and the React game entry/screen.
