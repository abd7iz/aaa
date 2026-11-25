# MUKHTABAR — Project Status

Last updated: 2026-11-25
Current UI asset version: v25

## Repository
- Code: https://github.com/abd7iz/aaa
- Site: https://abd7iz.github.io/aaa/
- UI: index.html
- Simulation engines: simulation-engine.js
- AI proxy: ai-worker/worker.js

## Active laboratories
1. Mitosis — staged cell division; preserve existing design and behavior.
2. Projectile motion — numerical trajectory.
3. Planetary orbit — numerical integration and procedural star/planet textures.
4. Tokamak — educational visual model with 18 toroidal-field coils, six poloidal-field coils, six central-solenoid modules, cryostat envelope, plasma volume, particles and field lines. Not an MHD solver.
5. Young double slit — dynamic wavefronts and calculated interference fringes; controls wavelength, slit separation and screen distance; readout includes fringe spacing.
6. Electromagnetic induction generator — rotating copper coil between N/S poles, magnetic field lines, current-carrier indicators and sine-wave oscilloscope; controls field, coil area, turns, angular_speed and resistance; readouts include flux linkage, instantaneous/peak emf and current.
7. Sinusoidal wave, pendulum and generated 3D scene engines.

## Double-slit experiment
- Engine ID: interference
- Defaults: 550 nm, 0.25 mm slit separation, 1.5 m screen distance.
- Expected fringe spacing: 3.30 mm.
- Assumptions: coherent monochromatic light, ideal slits, far-field approximation; finite slit-width diffraction envelope is not included.

## Induction experiment
- Engine ID: induction
- Defaults: B = 0.8 T, A = 0.04 m², N = 100, ω = 12 rad/s, R = 4 Ω.
- Peak induced emf: NBAω = 38.4 V.
- Displays rotating copper coil, N/S magnets, a uniform-field illustration, moving charge-carrier indicators and a phase marker on a sinusoidal emf trace.
- Assumptions: uniform field, constant angular speed and fixed load resistance; losses and load torque are not modelled.

## Validation
- CI parses all inline app scripts, simulation-engine.js, Worker and config.
- Node smoke tests verify interference and induction schemas and default controls.
- Syntax/CI success does not replace an actual visual test on the user's Android device.

## Next priorities
1. Verify interference and induction visually on Android; tune camera framing and labels from screenshots.
2. Add a diffraction-grating engine using a physically grounded intensity formula.
3. Add analytic electric/magnetic field visualization rather than relying only on decorative particles.
4. Preserve the original visual language and mitosis simulation.
5. Keep all generated models within safe JSON specifications.

## Continuity
- User prefers concise Iraqi Arabic and practical changes, not decorative redesign.
- User is phone-first; keep geometry and particle counts low.
- Do not claim autonomous background execution or automatic new-chat handoff.
- Update this file after each stable release so a new conversation can resume from the latest project state.
