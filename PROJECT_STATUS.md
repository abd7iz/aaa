# MUKHTABAR — Project Status

Last updated: 2026-11-25
Current UI asset version: v26

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
7. Fraunhofer diffraction grating — multiple parallel slits, dynamic wavefronts, calculated multi-slit intensity with finite-width slit envelope; controls wavelength, grating spacing, slit count, slit width and screen distance; readouts include first-order angle and highest possible order.
8. Sinusoidal wave, pendulum and generated 3D scene engines.

## Double-slit experiment
- Engine ID: interference
- Defaults: 550 nm, 0.25 mm slit separation, 1.5 m screen distance.
- Expected fringe spacing: 3.30 mm.
- Assumptions: coherent monochromatic light, ideal slits, far-field approximation; finite slit-width diffraction envelope is not included.

## Induction experiment
- Engine ID: induction
- Defaults: B = 0.8 T, A = 0.04 m², N = 100, ω = 12 rad/s, R = 4 Ω.
- Peak induced emf: NBAω = 38.4 V.
- Displays rotating copper coil, N/S magnets, uniform-field illustration, moving charge-carrier indicators and a phase marker on a sinusoidal emf trace.
- Assumptions: uniform field, constant angular speed and fixed load resistance; losses and load torque are not modelled.

## Diffraction grating experiment
- Engine ID: diffraction
- Defaults: λ = 550 nm, grating spacing d = 5 μm, N = 5 slits, slit width a = 0.35 μm, screen distance L = 1.5 m.
- Model intensity: `I ∝ sinc²(α)[sin(Nβ)/(N sin β)]²`, with `β = πd sinθ/λ`, `α = πa sinθ/λ`.
- Main maxima satisfy `d sinθ = mλ`.
- Assumptions: Fraunhofer approximation, identical equally spaced slits and coherent monochromatic light. No surface roughness, reflections, losses or finite element optical solver.

## Validation
- CI parses all inline app scripts, simulation-engine.js, Worker and config.
- Node smoke tests verify interference, induction and diffraction schemas and default controls.
- Syntax/CI success does not replace visual testing on the user's Android device.

## Next priorities
1. Verify diffraction and induction visually on Android; tune camera framing and contrast from screenshots.
2. Add a dedicated analytic electromagnetic-field visualization (vector field and magnetic flux density), separate from the generator demo.
3. Add optical polarization or a wave-optics experiment after diffraction is confirmed.
4. Preserve the original visual language and mitosis simulation.
5. Keep all generated models within safe JSON specifications.

## Continuity
- User prefers concise Iraqi Arabic and practical changes, not decorative redesign.
- User is phone-first; keep geometry and particle counts low.
- Do not claim autonomous background execution or automatic new-chat handoff.
- Update this file after each stable release so a new conversation can resume from the latest project state.
