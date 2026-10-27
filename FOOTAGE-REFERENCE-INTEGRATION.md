# Package Peddler footage reference integration

Date: 2026-10-09

The owner's Package Peddler route footage is private development reference only. No video frame, address, person, license plate, house, sign, logo, or filmed layout is included in Breed & Beyond or its release archive.

## Reference-to-game translation

- A filmed dog moving around a residential property informed a new autonomous yard-dog behavior: walking between safe points, pausing, and sniffing inside a fenced yard.
- Residential roads and delivery approaches informed an original Willowbrook lane with sidewalks, varied lawns, mailboxes, a hydrant, utility poles, and overhead lines.
- Community open-space footage informed a small fictional neighborhood water feature and landscaped verge.
- All proportions, placements, colors, names, routes, architecture, and combinations were redesigned for Willowbrook.

## Regression invariants

- The playable human retains camera-relative keyboard, touch, and gamepad movement.
- The companion dog remains the only dog attached to player care, training, progression, and saves.
- The ambient yard dog never grants rewards, changes care stats, or enters the player's save data.
- The yard dog remains inside its authored yard bounds and cannot follow the player.
- Existing shop, home, clinic, daycare, scent, rally, economy, once-per-day rewards, save key `breedBeyond3D.v3`, and legacy-save isolation remain unchanged.
- The release whitelist contains no `.mp4`, `.mov`, extracted footage frames, real addresses, or filmed branding.

## Acceptance checks

1. Start a fresh town session and observe the yard dog change position without player input.
2. Confirm every sampled yard-dog position stays inside the fictional yard bounds.
3. Walk the existing shop-to-home route and verify new roadside props do not block it.
4. Complete the established care, save/reload, scent, marketplace, clinic/daycare, and controller regression suites.
5. Rebuild the portable archive and verify every packaged byte against the source whitelist.
