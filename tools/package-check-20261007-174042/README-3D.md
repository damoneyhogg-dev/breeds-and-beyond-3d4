# Breed & Beyond — 3D gameplay milestone

Open `index.html` in Chrome or Edge. No server, installation, account, or internet connection is needed after downloading/extracting the package. WebGL2/hardware acceleration must be available. `play-3d.html` is the equivalent local development entry.

## Controls

- Keyboard/mouse: WASD or arrows move, mouse/drag looks, Shift sprints, E interacts, Escape pauses, Backspace cancels, and C changes camera.
- Standard gamepad: left stick moves with analog speed, right stick orbits, press left stick to sprint, primary face button interacts, cancel face button backs out, and menu/start pauses.
- The Controls panel configures mouse sensitivity, horizontal/vertical controller sensitivity, invert Y, and radial controller dead zone.
- Prompts switch automatically between keyboard/mouse, touch, and generic controller labels.
- Touch devices: hold directional buttons; drag the scene to look; tap the interaction button.

## First playable route

1. Choose a pet parent and enter Willowbrook.
2. Walk to the front door of Rene's shop, on the left ahead of the starting road crossing. Press E.
3. Approach Rene or a puppy. Choose Coco, Atlas, or Nova; the starter package costs 80 fictional coins.
4. Walk to the shop exit. Find HOME on the opposite side of town, south of the crossing. Enter it with your puppy.
5. Walk to the bowls, play space, and recall marker. Feed, play fetch, and train in real time.
6. At the bed, rest or sleep until the next day. Feeding and play are required before sleeping.
7. Explore the scent grove northwest of the shop. Walk the dog to three hidden articles. The dog investigates nearby targets; rewards are limited to once per game day.
8. Training field east of the central road: recall practice and a five-gate adult rally course. Adult eligibility requires age 365 game days and skill 25.

Each completed day advances age by 14 days; this is game-time acceleration, not a real feeding/training schedule. Essentials are free at home. Clinic/daycare use virtual coins. All care information is educational, not diagnosis or treatment instructions.

## What this is, and is not

This is a genuine WebGL 3D gameplay milestone, not the finished full game. It includes a rebuilt camera-relative third-person controller, analog gamepad input, acceleration/deceleration, collision and authored ground following, procedural locomotion blending, interaction alignment, puppy inspection framing, four walkable interiors, procedural walking dogs, spatial activities, progression, and local save. See `CONTROLLER-AUDIT.md` for verified behavior and limits.

**The human and dog meshes are provisional geometric models. They are not photorealistic, photo-reconstructed, or exact likenesses of Coco, Atlas, or Nova.** The JPGs remain reference images in the puppy-selection interface. Final rigged dog/human models, realistic fur, high-quality animation, vehicles, large open-world content, additional breeds, two-parent households, full breeding/life systems, and expanded competitions remain unfinished. Clinic and daycare now have walkable prototype interiors with spatial care stations and exits; the services still use dialogs, not full treatment or daycare animations.

## Saves and legacy build

The 3D version uses `breedBeyond3D.v3`. It never modifies `breedBeyondSave` from the earlier prototype. Old progress is not automatically migrated. Storage is browser/origin-specific and not cloud synced. Private browsing/storage blocking can prevent persistence; a notice appears if saving fails. Invalid 3D saves start a fresh safe session; the next successful save replaces that invalid 3D value.

The earlier local entry is preserved as `legacy-prototype.html` with its original `game.js` and `style.css`; it is not included in the new 3D upload ZIP. The previous ZIP is backed up under `build-backups` in the workspace. No game has been published by this build.

## Hosting

Upload `Breed-and-Beyond-browser.zip` as an HTML game on a separate itch.io project. `index.html` is at ZIP root; assets use relative forward-slash paths. Enable fullscreen and use a resizable viewport. Do not label mobile performance certified until tested on physical target devices.

## Verification / rebuilding

- `node --test simulation.test.cjs`
- `node tools/playthrough.cjs` (requires Chrome at the configured local Windows path)
- `node tools/smoke.cjs`
- `node tools/node_modules/esbuild/bin/esbuild world.js --bundle --format=iife --outfile=world.bundle.js --minify`
- `powershell -File tools/package.ps1`

Local development dependencies are pinned in `tools/package-lock.json`; they are not shipped in the ZIP. Three.js is bundled under its MIT license; see THIRD-PARTY-NOTICES.txt.
