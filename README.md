# Gym Paradise

A first playable prototype for an aspirational private gym builder, designed for iPhone Safari and laptop browsers. Built with TypeScript, React, Babylon.js, and the Sites/Vinext starter.

## Run locally

Requires Node.js 22.13 or later. Run `npm install`, then `npm run dev -- --host 0.0.0.0`. Open the printed local URL on your laptop. For an iPhone on the same Wi-Fi, use the laptop's LAN address and that port. The private hosted version uses your site-owner login.

## Implemented

- Interactive 3D warehouse with original comic mural, lighting themes, mirror wall, and eight original equipment types.
- Fifteen-piece starter layout; add up to 40 pieces, drag or nudge, rotate, duplicate, remove, undo, and redo.
- Room and equipment collision checks; first-person walking with keyboard and touch controls.
- Browser-local saving, validated JSON import/export, and clean 3D image downloads.
- Walkthrough mode for use with device screen recording.

## Current boundaries

Equipment geometry and dimensions are approximate, original concept models. They are not verified Hammer Strength or Technogym replicas or purchasing specifications. Photo recognition, equipment wishlists, automatic video export, account sync, public visit links, and workout logging are planned but not implemented. No AI API or paid service dependency is required by this prototype.

Local saves are specific to a browser and device. Export a backup before clearing browser data or switching devices. Importing a layout creates an undoable replacement. No images or workout data are sent to an AI provider.

## Validation

- `npx tsc --noEmit --incremental false`
- `node --experimental-strip-types --test tests/gym-data.test.mjs`
- `npm run lint -- app lib tests` (authored source; the untouched starter component library has separate baseline lint findings)
- `npm run build`

The first release requires real iPhone testing for touch handling, browser behaviour, rendering speed, and memory use. Automated layout tests do not establish real-device graphics performance.
