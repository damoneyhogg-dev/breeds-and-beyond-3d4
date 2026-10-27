# Breed & Beyond — legacy browser audit

Date: 2026-10-06. Scope: read-only inspection of the existing `index.html`, `game.js`, `style.css`, and asset inventory. This report does not certify the new 3D entry or a complete play-through.

## Executive finding

The existing entry is a DOM-based management prototype with a movable map marker, not a third-person 3D game. It contains useful care/progression concepts but does not meet the requested person-walks-into-a-pet-shop experience. Three JPG photographs are references/portraits, not rigged dog models. A separate real-time 3D scene is the appropriate next step; preserve this entry as a backup rather than describing it as completed 3D gameplay.

## Verified checks

- `node --check game.js` passes.
- Three local assets exist: `assets/coco.jpg`, `assets/atlas.jpg`, `assets/nova.jpg`.
- Movement key and mobile-button handlers exist at the bottom of the source. Earlier reviews saying movement was entirely unbound are stale.
- Setup and health/energy guards exist for field mission launch, scent search, and competition.
- JSON syntax errors in saved data are caught, but complete storage/schema resilience is not implemented.
- UTF-8 reads of all three source files show no common mojibake sequences. Windows PowerShell's default text decoding displays false corruption; do not replace correct source punctuation based on that output.

## Priority findings

### P1 — Onboarding does not refresh dependent controls

`startWalkHome()` (game.js:75) sets `setupComplete` after 2.2 seconds but only calls `renderLife()` and `saveGame()`. It does not rerender the event buttons, match entry, puppy choices, routine tasks, or day gate. A fixed 2.3-second routine refresh runs from page load rather than completion, so it normally occurs before the user finishes choosing a puppy. Result: onboarding completion can leave the first-day tasks and events disabled until unrelated UI actions or reload. Use one state-change/render path, called when the transition finishes.

### P1 — Location proximity is visual, not authoritative

`renderWalkPosition()` opens a location card on approach, but leaving the location does not clear or disable its actions. `renderWorld()` actions never check current distance. Users can walk away and continue buying supplies or using daycare remotely. The pet-parent/puppy setup remains globally visible and also bypasses entering the shop. Gate interactions in gameplay logic and put shop/home activities in real enterable scenes.

### P1 — Save recovery only validates JSON and coins

The load block (game.js:54–56) accepts arbitrary `life`, `progress`, `reneBenefits`, parent IDs, and coordinates. Valid JSON with an unknown Rene service key crashes `renderSetupSummary()`; missing life fields produce invalid statistics; oversized coordinates place the player off map. `localStorage.setItem()` is unguarded; unavailable storage or quota errors interrupt handlers and can interrupt initialization through `renderBriefing()`. Validate and migrate a complete schema, clamp all fields, and tolerate unavailable storage with a visible session-only-save notice. Never discard recoverable saves silently.

### P1 — Missions remain arbitrary quizzes

`launchFieldMission()` makes the first displayed clue correct, then `resolveFieldMission()` randomly chooses a new correct clue without new evidence. Only the last choice affects reward; weather/difficulty are display-only and do not alter the search. This is not a skill-based tracking activity. Replace with spatial scent cues, a dog following or investigating objects, clear player commands, and a persistent target placement. Score the whole activity rather than only the final click.

### P1 — Activities have no meaningful time/resource balance

Daily care can be spammed without time advancement; feeding and rest can restore stats indefinitely and training can immediately max skills. `renderSearch()` keeps the successful button enabled, allowing repeat payouts on the same already-found article (subject only to energy, which free rest restores). Mark searches completed and consume bounded in-game time for care/training, while retaining a forgiving recovery path.

### P2 — Stale readiness UI

`doLifeAction()` updates life and save but not match entry/readiness; care or rest can leave a competition button in the prior disabled state. Day advancement similarly does not refresh all dependent UI. A centralized state renderer avoids cross-panel discrepancies.

### P2 — Duplicate declarations hide obsolete implementations

Multiple `renderLife`, `renderEvents`, `renderMatch`, `finish`, and `renderPuppyShop` declarations coexist. In a classic script, final declarations are hoisted and replace earlier declarations even before their textual position. Therefore comments suggesting sequential overrides and `oldFinish` snapshots are misleading. Remove obsolete versions in a controlled refactor, keeping one implementation per function and a small initialization sequence.

### P2 — Progression and fairness claims exceed implementation

Dogs start at age 42 days; adulthood at 365 requires 323 manual day advances. Adulthood changes descriptive text, not actual advanced-event eligibility. Opponents are fixed name strings, and performance is a weighted readiness value plus randomness; there is no actual age/size/skill matchmaking or opponent simulation. All breeds can enter all events. Add explicit life-stage milestones, event-specific skills, dog-specific suitability, and verifiable unlock conditions before claiming these systems exist.

### P2 — Movement and presentation limitations

Movement uses fixed percentage steps per keydown, so speed depends on keyboard repeat and map proportions. Keys work across the page except text inputs; there is no collision, camera follow, terrain navigation, game-loop movement, or independently animated companion. Mobile controls are click-based rather than held movement. Destination prompt says tapping a nearby marker interacts, but its click handler only displays route guidance. Use frame-time-based movement, scoped input, collision, proximity interactions, and touch hold/joystick controls in the 3D entry.

### P2 — Care and purchases lack gameplay consequence

Rene services are one-time stat bonuses rather than recurring interactive care. Supplies deduct coins but add no inventory. Puppy selection has no price/adoption transaction. Photos do not change with age, and no puppy/adult model or animation exists. Define inventory, repeatable services with clear effects, and visible age progression; keep veterinary information educational and source-backed.

## Verification options and required next checks

No `playwright`, `@playwright/test`, or `puppeteer` package resolves from this folder. Microsoft Edge is installed at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. Browser automation can be installed in an isolated tools directory, or Edge can be driven headlessly with a temporary profile and local HTTP server. A syntax pass is not evidence of gameplay correctness.

Run real browser checks for: clean start; parent and puppy choice; transition completion without reload; first-day completion; event gating; repeated reward prevention; exhausted-dog recovery; refresh/save restoration; malformed but syntactically valid saves; storage failure; keyboard focus; touch movement; viewport resizing; all asset requests; console errors. For the new 3D entry also inspect screenshots from actual rendering, collisions, pet-shop entry, puppy acquisition, follow camera, companion motion, and cinematic exit controls.

Do not call portraits realistic animated models, a timer a walk-home journey, syntax checking a full audit, or the browser prototype a completed open-world game. Report improvements and remaining visual/asset limitations separately.

## Separate new 3D-entry review

The newly authored `play-3d.html` / `world.js` / `world.css` / `simulation.js` entry is a genuine Three.js scene with a third-person camera, animated provisional human/dog meshes, town geometry, navigable shop/home interiors, collision for the player, real-time care activities, and spatial courses. The legacy finding of "no 3D scene" above does **not** apply to this new entry. Its welcome screen correctly labels models provisional rather than photorealistic.

Read-only issues sent to the builder for remediation (these describe the reviewed snapshot; final QA must check subsequent patches):

1. **High — Welcome Escape softlock:** Native dialog cancellation closes the welcome screen while `running` remains false, with no way to start. Prevent the welcome dialog's `cancel` default or provide a reopen/start path.
2. **Medium — Inconsistent event health gate:** `startMission` accepts health 50–59, but simulation rewards require health 60. A player can finish a whole course and be denied reward. Align admission and completion criteria.
3. **Medium — No manual mission cancellation:** Missions suppress all interactions, including entering home. A player must complete or wait 240 seconds. Provide an explicit cancel-without-reward action.
4. **Medium — Companion ignores collision:** `moveDog` directly interpolates toward target without checking walls/furniture. Dogs can cross solid buildings during following. Add collision-aware companion routing or a documented safe-position fallback.
5. **Low — Daycare pricing mismatch:** UI quotes 12 coins; simulation deducts 10. Use one shared cost value.

Module source parses using `node --input-type=module --check` through stdin; `simulation.js` and the generated `world.bundle.js` also pass syntax checks. `node --check world.js` by itself uses CommonJS mode in this folder and is not the correct source check. The HTML loads the bundle, so all world.js fixes must be followed by rebundling. Parent is conducting actual browser QA; this addendum does not claim those interactive tests were executed by this reviewer.
