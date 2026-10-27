# Breed & Beyond — audit and 3D remediation

Date: 2026-10-06. This report describes this build, not the completion of the requested full open-world game.

## Scope and evidence

Reviewed the prior HTML/JavaScript/CSS, photos, rendering architecture, care/progression logic, save validation, keyboard/touch controls, economy, scene interactions, dependency choice, and browser packaging. An independent read-only pass is in AUDIT-LEGACY.md. New gameplay was exercised in headless installed Chrome with real WebGL rendering; screenshots were inspected. Physical phones, Safari, GPU hardware performance, multiplayer, and a live itch.io deployment were not tested.

## Principal finding

The previous build is a management-screen/quiz prototype. Moving its marker or changing its colors cannot make it a third-person 3D game. Three photo assets are not 3D models. Its largest architectural problems are duplicated rendering functions, incomplete state validation, stale onboarding controls, remote location actions, arbitrary clue answers, and repeated reward/care exploits.

The old implementation is preserved, not falsely declared repaired. The new default entry runs a separate Three.js world and tested state module. No paid service or proprietary engine is required. Three.js was chosen after checking the maintained npm package rather than writing a custom rendering engine.

## Improvements implemented in the new entry

| Area | Result |
| --- | --- |
| World | Perspective WebGL environment, roads, trees, buildings, shadows, textured ground, interior furniture |
| Player | Third-person playable human, camera-relative WASD/arrows, running, drag-look, touch movement, wall collision |
| Cameras | Follow, close, cinematic orbit; cinematic gameplay pause; collision-aware camera placement |
| Shop | Walk to the doorway, enter an interior, approach Rene/puppies, choose a parent and companion, pay starter cost |
| Home | Actually walk home and enter; location-bound food, bed, fetch, and recall activities |
| Dogs | Three distinct provisional breed-shaped procedural meshes, leg/tail motion, following with collision and path history |
| Events | Spatial three-target scent search and gated adult five-checkpoint rally; no quiz answers |
| Care/progression | Bounded stats, daily activity limits, care requirements before sleeping, accelerated age, skill and adult gates |
| Economy | One adoption, once-per-day event rewards, free basic care, matching displayed/service prices |
| Saves | Separate versioned key, schema validation, storage/JSON exception handling, safe spawn validation, legacy key untouched |
| Usability | On-screen objective, contextual E/tap prompt, pause, activity cancellation, fullscreen, low-quality option |
| Packaging | Local bundled renderer, no runtime CDN, explicit file whitelist, root index, forward-slash paths, license notice |

## Independent new-code review fixes

- Prevented Escape from dismissing the start dialog and leaving an unstartable scene.
- Aligned mission admission with reward health requirements (60).
- Added an explicit activity-cancel action without rewards.
- Added collision checks and player-path history for the dog follower.
- Corrected daycare display to match the actual 10-coin charge.

## Verified tests

- Six simulation suites: onboarding/adoption, care/growth, event gates and repeated rewards, parent effects, save roundtrip and legacy isolation, malformed data/storage failure.
- Chrome playthrough: real keyboard walk from street to shop, entry and Coco selection, exit and walk home, feeding, animated fetch, recall, day advancement, save/reload.
- Chrome scent course: saved-position fixture followed by real movement to all three articles; exactly one ribbon and one reward.
- Camera test: cinematic mode blocks player movement and returns to play.
- Welcome Escape regression test.
- Small-viewport layout and runtime exception check.
- Wall collision and authoritative interaction distance in Chrome.
- Health-gate and cancel-without-reward regressions.
- Coarse-pointer viewport with held on-screen movement buttons, plus pause freeze.
- ZIP entry whitelist and byte-for-byte content verification.
- Browser screenshots: qa-start.png, qa-shop.png, qa-home.png, qa-mobile.png (local evidence, not production assets).

Additional touch, collision, package, and source checks are recorded by the build tools. A successful headless test is not a guarantee of real-device frame rate or visual quality.

## Remaining work — not hidden behind “complete”

**High priority:** realistic rigged human and dog models, photo-matched Coco likeness, fur/material work, high-quality animation, art direction, larger terrain, stronger navigation/wayfinding, physical-device performance and accessibility review. The current geometric figures do not satisfy the requested final realistic visual standard.

**Gameplay:** full clinic/daycare interiors, household second parent, breeding/birth, complete age/size/weight system, multiple dogs, vehicles, robust inventory, more breeds and competitions, weather/scent simulation, complete nutrition/vet content with citations, audio, richer mission progression. Current growth has two model scales; adult rally is a walking-gate course, not a finished animated agility sport.

**Technical:** no cloud saves, multiplayer, anti-cheat, or global pathfinding/navmesh. Companion routing is suitable for the small test map but is not a full NPC navigation system. Cinematic mode is an orbit view, not authored story cutscenes. Art uses provisional geometry and existing photo references only; it is not reconstructed from those photographs.

## Release recommendation

Use as an internal 3D gameplay milestone. Do not market it as finished, photorealistic, GTA-scale, or the final shareable version. Keep the user's prior save and prototype available. No publication performed.
