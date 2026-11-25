# MUKHTABAR — Project Status

Last updated: 2026-11-25

## Current repository state
- Repository: https://github.com/abd7iz/aaa
- App: https://abd7iz.github.io/aaa/
- Latest UI cache version: 22
- Main UI: index.html
- Simulation engine: simulation-engine.js
- AI proxy: ai-worker/worker.js
- Runtime: Three.js, browser-side scene engine, safe JSON simulation specifications.

## Current features
- Mitosis: staged cell division scene; preserve the existing look and behavior.
- Projectile motion: parameterized trajectory.
- Planetary orbit: numerical integration and procedural star/planet textures.
- Tokamak: educational visual model with plasma torus, 18 shared D-shaped toroidal-field magnet housings, six poloidal-field coils, six central-solenoid modules, cryostat envelope, helical particles and field lines. It is not an MHD solver.
- Young double-slit interference: dedicated engine; sliders for wavelength (nm), slit separation (mm), screen distance (m); dynamic wavefront rings; calculated screen fringe pattern; displayed fringe spacing.
- General generated 3D scenes, sinusoidal waves and pendulum engine.
- Saved experiments in local IndexedDB with localStorage fallback.
- View-size slider for generated-engine scenes; rotate with one-finger drag and zoom with pinch.

## Double-slit experiment
- Engine ID: interference
- Default wavelength: 550 nm
- Default slit separation: 0.25 mm
- Default screen distance: 1.5 m
- Expected fringe spacing: 3.30 mm
- Model: coherent monochromatic light, ideal slits and far-field approximation. Finite slit-width diffraction envelope is not included.
- Available as a built-in physics experiment and through the AI-create prompt; local demo matching recognizes "تداخل", "شقين", "شق يونغ", "يونغ", "double slit", and "interference".

## Validation
- GitHub Actions validates all inline scripts, simulation-engine.js, worker, config and wrangler JSON.
- Added a Node smoke test for interference spec normalization and default control values.
- CI / Pages run IDs for v22 are recorded in the Actions page; check latest before continuing.

## Next engineering priorities
1. Browser-runtime testing of the double-slit scene on a phone; check wavefront visibility, fringe contrast, and slider response.
2. Fix visual issues from screenshots before adding more shaders or geometry.
3. Add a second dedicated experiment with a physically meaningful model, not only a decorative 3D scene. Suggested next candidate: electromagnetic induction with a rotating coil, magnetic field, flux and induced emf.
4. Keep models mobile-friendly; use shared geometries, cap particles and pixel ratio.
5. Update this file and README after each stable release.

## Continuity rules
- Do not remove or redesign the original mitosis implementation.
- Keep the existing Claude-inspired app layout; avoid gratuitous UI redesign.
- The user prefers direct Iraqi Arabic and dislikes repeated questions and cosmetic-only changes.
- Do not claim a deployment or phone test succeeded until the relevant GitHub Actions run succeeds and the user confirms the visual result.
