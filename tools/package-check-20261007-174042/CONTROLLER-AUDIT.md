# Breed & Beyond — controller, input, animation, and camera audit

Date: 2026-10-07

## Existing project inspected

- **Engine/runtime:** Three.js 0.186.1, bundled with esbuild into an offline HTML5/WebGL build.
- **Previous controller:** frame-loop keyboard polling with one walk speed and one sprint speed; position changed immediately per frame.
- **Previous input:** scattered key checks plus touch buttons; no Gamepad API abstraction, analog movement, input-device switching, controller prompts, configurable sensitivity, or dead-zone handling.
- **Previous camera:** raw pointer-drag yaw/pitch, position lerp, and AABB ray collision. It had no input abstraction, inspection transition, indoor distance policy, or configurable sensitivity.
- **Previous animation:** a provisional geometric human whose whole legs and arms swung from the hips/shoulders. There was no locomotion state machine, acceleration-aware blending, knee/foot articulation, backward/strafe states, or speed-synchronized cadence.
- **Character rig/assets:** a procedural geometric rig and procedural dog meshes. No approved production human animation asset is present. `tools/unused-human-reference.glb` contains Idle/Walk/Run clips but is deliberately not shipped or used because its provenance/license is not documented.

## Replaced

- Added an action-based input layer: `Move`, `Look`, `Interact`, `Sprint`, `Pause`, `Cancel`, and `Camera`.
- Added standard Gamepad API support with radial dead zone, true analog magnitude, right-stick camera, L3 sprint, primary/cancel/menu actions, active-device switching, generic controller prompts, and disconnect recovery.
- Added acceleration, deceleration, normalized diagonal movement, camera-relative travel, swept collision substeps, smooth facing, indoor speed limits, ground-height following, curb/ramp/stair test surfaces, and grounded-state diagnostics.
- Rebuilt the procedural human as a joint hierarchy with hips, spine, upper/lower arms, upper/lower legs, and feet.
- Added blended locomotion states: idle, walk, walk backward, strafe left/right, run, and turn. Start/stop behavior is produced by velocity damping and blend weights rather than pose snapping. Gait cadence follows actual movement speed.
- Added smooth interaction alignment. The player approaches and rotates toward doors, puppies, bowls, beds, training points, vehicles/NPC-style targets, and other interaction anchors without a visible teleport.
- Added a damped third-person camera with free orbit, collision contraction/recovery, tighter indoor distance, no forced recentering, cinematic orbit, and smooth puppy-inspection framing/return.
- Added camera/control settings for mouse sensitivity, horizontal/vertical controller sensitivity, invert Y, and controller dead zone.

## Files changed

- `world.js` — integrated controller, interaction alignment, grounded surfaces, inspection mode, prompts, and diagnostics.
- `controller.mjs` — new input, character-controller, procedural locomotion, and camera systems.
- `index.html`, `play-3d.html` — controls UI, active-input display, settings dialog, corrected control guidance.
- `controls.css` — controller/settings UI and mobile pointer fix.
- `world.bundle.js` — rebuilt browser bundle.
- `controller.test.mjs` — controller math and collision tests.
- `tools/controller-playthrough.cjs` — browser-level simulated standard-gamepad tests.
- `tools/playthrough.cjs`, `tools/regressions.cjs` — interaction-alignment, inspection, indoor camera, pause, collision, touch, and full-route checks.
- `tools/package.ps1` — ships the new stylesheet and audit.

## Current mappings

### Keyboard and mouse

- Move: WASD or arrow keys
- Camera: mouse/drag on the 3D view
- Sprint: Shift
- Interact: E
- Pause: Escape
- Cancel/back: Backspace or the on-screen Leave activity button
- Camera mode: C or Camera button

### Standard gamepad

- Move: left stick, analog
- Camera: right stick
- Sprint: press left stick (L3)
- Interact: primary face button
- Cancel/back: cancel face button
- Pause: menu/start button

Prompts use generic labels rather than Xbox-only glyphs.

## Default camera/input settings

- Follow distance: 6.3 m
- Indoor maximum distance: 4.2 m
- Close camera: 3.35 m
- Pitch range: -0.12 to 0.82 radians
- Position damping: 9 outdoors / 13 indoors
- Obstruction contraction/recovery: 18 / 6
- Mouse sensitivity multiplier: 1.0 (base 0.0022)
- Controller horizontal multiplier: 1.0 (base 2.2 rad/s)
- Controller vertical multiplier: 1.0 (base 1.7 rad/s)
- Controller dead zone: 0.16 radial
- Invert Y: off

## Verification completed

- Pure controller tests: dead-zone drift rejection, analog scaling, normalized diagonals, smooth acceleration/deceleration, sprint blend, smooth turning, ground following, and swept collision.
- Browser simulated standard-gamepad tests: partial-stick walk, full-stick speed, L3 sprint/run, right-stick orbit, camera stop on release, keyboard/controller switching, pause, and controller disconnect.
- Full browser route: start, street movement, pet-shop entry, puppy inspection camera, adoption, shop exit, walk home, indoor camera distance, feed, fetch, recall, sleep, save/reload, scent course, and cinematic pause.
- Regression checks: wall collision, authoritative interaction range, health gates, cancellation without reward, touch movement, and frozen pause state.
- Existing simulation tests remain green.

## Temporary assets and remaining issues

- The human is still a **provisional geometric rig**, not a production realistic character. The procedural animation is materially smoother and functionally state-driven, but it cannot equal motion-captured animation, IK foot locking, or a professionally authored humanoid rig.
- No approved external animation clips are used. Production replacement still requires a licensed rigged human plus idle, directional walk, backward/strafe, jog/run, turn, start, stop, and interaction clips.
- Foot contact is procedurally improved, but true per-foot IK against arbitrary mesh terrain is not implemented.
- Grounding supports the current authored floors, curbs, ramp, and validation steps; it is not a navmesh or general triangle-mesh character capsule solver.
- Automated gamepad verification used a simulated standard Gamepad API device. A physical Xbox/PlayStation/Switch-style controller and physical-device performance pass are still required before claiming hardware certification.
- Puppy models remain provisional. Inspection framing is complete, but production dog rigs/fur are a separate art task.

No unrelated gameplay systems were expanded in this pass.
