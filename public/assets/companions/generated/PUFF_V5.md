# Puff Bird V5 and companion moods

## Saved assets

- `public/assets/companions/generated/puff-bird-v5.png` — first connection; 1254 × 1254 RGBA.
- `public/assets/companions/generated/puff-bird-explorer-v5.png` — explorer; 1254 × 1254 RGBA.
- `public/assets/companions/generated/puff-bird-mature-v5.png` — mature; 1254 × 1254 RGBA.

## Method

Generated with the built-in image_gen tool using the user's supplied figurine photo as identity reference and puff-bird-v4.png as style reference. Then removed only the baked eyelids with image_gen and generated two growth variants. Original alpha preserved; no raster postprocessing. Older assets are retained. Small eyes and expressions are rendered in SVG over the blank eye locations, so all four states share the same body artwork without face jumps. The shirt intentionally stays light blue and has no lettering, following the user's earlier preference.

## Original identity prompt

Use case: stylized-concept. Generate a new transparent full-body Puff bird sprite for the existing PuffSqueeze web companion. Image 1 is IDENTITY AND SHAPE reference: the white bird sculpture in the middle of the user photo only. Image 2 is RENDERING STYLE reference: preserve its softly shaded clean illustrated plush/clay style, light pastel colors and delicate texture. Change the bird's identity to match photo1 closely: upright rounded egg-shaped white body/head with no neck, a thick curved backward hook white forehead feather bending toward image-left, TWO SMALL simple dark dot eyes (not large anime eyes), small round rosy cheeks, small vertically pointed yellow teardrop/cone beak with mouth closed, plain powder/light-blue short-sleeve shirt across its lower body, white rounded wings/hands and small yellow webbed feet. Shirt MUST HAVE NO TEXT OR LETTERS (do not copy the XJTLU lettering in photo). The photograph's social UI, room, hand, display base, easel, paintbrush and palette are NOT part of this idle sprite. Relaxed natural neutral standing pose, both wings gently out by the sides, gentle slight tilt but nearly frontal. For animation base: draw only TINY relaxed CLOSED eyelid curves instead of the two dot pupils, about 2% of sprite width per eyelid, no eyebrows. We will overlay the small dot eyes in code. Keep the small-eye proportions of the reference, not the giant eyes of style image2. Full body centered within 80% of square transparent canvas, generous clear margin, no ground shadow, no background, no accessories, no lettering, no watermark. Soft diffuse illumination, approachable expression, fit with existing companion series. One isolated character.

## Final asset prompts

### base

Use case: precise-object-edit. Edit target: supplied transparent Puff bird sprite. Remove ONLY the two dark closed-eyelid arcs, filling their positions with the same soft white feather surface. Leave the face blank at the eye locations so tiny eyes can be animated programmatically. Keep EVERYTHING ELSE identical: same exact white egg silhouette, curved hooked head tuft, pink cheeks, yellow pointed beak, light blue plain T shirt without text, wings, feet, position and scale, softly shaded plush/clay illustrated style, and genuine transparent background. Do not add any eyes, pupils, eyelids, eyebrows, text, or new objects. This is a tiny cleanup of the existing sprite, not a redesign.

### explorer

Use case: stylized-concept. Reference image is the exact identity and soft plush/clay illustration style for PuffSqueeze's white bird. Generate its next GROWTH stage: a clearly more upright, taller, slimmer egg-shaped young explorer, longer lower torso, wings a little longer and posed confidently on its hips, slightly longer yellow feet visible. Preserve the single thick white hooked curl bending image-left, white face continuous with body (no neck), small rosy round cheeks and a small yellow vertically pointed closed beak. Plain light BLUE short sleeve shirt with NO lettering. Face: DO NOT DRAW EYES, eyelids, eyebrows or pupils at all; leave white blank eye positions because small animated dot eyes will be added in code. Keep same frontal view with subtle lean. The overall silhouette should be recognizably different from the squat chubby base while retaining its simple minimal mascot identity, not an anatomically realistic bird. Centered full body occupies 80% of square canvas. Genuine transparent background, no ground shadow, no base, no props, no lettering. One isolated sprite. Same subtle texture and shading as reference, not glossy photo.

### mature

Use case: stylized-concept. Reference image is the exact identity and soft plush/clay illustration style for PuffSqueeze's white bird. Generate its final MATURE GROWTH stage: a taller pear-shaped confident white mascot, head smaller relative to torso than the baby, broad rounded shoulders with longer smooth white wings, one wing resting across chest and the other comfortably extended sideways, longer sturdy yellow feet; distinctly grown-up silhouette rather than simply enlarging the baby. Preserve the single thick white hooked curl bending image-left, smooth white face connected directly to torso without neck, small rosy round cheeks and small vertically pointed yellow closed beak. Plain light BLUE short sleeve shirt with NO lettering. Face: DO NOT DRAW EYES, eyelids, eyebrows or pupils at all; leave blank white eye positions for code-animated small dot eyes. Same near-frontal view with subtle lean. Simple mascot, not a realistic bird, no clothes decoration or added feathers. Centered full body occupies 80% of square canvas. Genuine transparent background, no ground shadow, no props, no base, no lettering, one isolated sprite. Same subtle texture and soft shading as reference.

## Expression controls

All eight species support happy, calm, tired and sleepy. `src/services/companionMoodService.ts` saves preferences per local account and animal in `puffsqueeze_companion_moods_<userId>`; prior `puffsqueeze_bird_mood_<userId>` values are read as a migration fallback. Changes propagate to Home, own Mindful Care space, growth gallery and floating companion using useSyncExternalStore plus storage events. These settings are local to this browser, not cloud-synced or a measurement of the user's mood. They do not change needs, XP or care history. Friends' rooms use calm locally and do not receive a mood write.

Bird uses small programmatic eyes on new images. Other species keep their existing art. Happy now uses separate bright open smile eyes with raised lower edges and highlights; sleepy reveals the painted relaxed closed eyelids. Tired has gentler partly closed eyes; calm has normal blinking. Sleepy adds a resting tilt; happy has slightly more lively sway. Reduced-motion preference remains supported.

## Checks

Focused TypeScript compilation and Vite production build. No tests added or run, and no care/XP events submitted for this change.


## Expression distinction correction

Happy and sleepy previously hid the same eye overlay for the seven non-Bird species, making their faces identical. Happy now renders a separate highlighted open smile-eye shape, while sleepy keeps relaxed closed eyes and a resting tilt. Bird smile arcs are raised more clearly; its sleep arcs curve gently downward. These shapes are shared by all growth stages, Home, Care and floating companions.

## Sleepy yawn update

The sleepy state now uses dedicated face-only raster edits with drooping half-lidded eyes and a vertically open yawning mouth/beak for all eight animals at all three growth stages. It no longer reveals the old happy eyelid artwork. See SLEEPY_YAWN_V1.md for final saved asset paths, references and exact built-in image_gen prompts. The other three expression states are unchanged.
