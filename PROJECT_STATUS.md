# MUKHTABAR — Project Status

Last updated: 2026-11-25
Current UI asset version: v27

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
8. Magnetic dipole — analytic dipole field lines, animated direction tracers and movable probe showing |B|, Bx and By; controls magnetic moment, probe radius, probe angle and line count.
9. Sinusoidal wave, pendulum and generated 3D scene engines.

## Physics models
- Double slit: `I ∝ cos²(π d x / λL)`; defaults 550 nm, 0.25 mm separation and 1.5 m distance; expected fringe spacing 3.30 mm.
- Induction: `εmax = NBAω`; defaults B=0.8 T, A=0.04 m², N=100, ω=12 rad/s; expected peak emf 38.4 V.
- Diffraction: `I ∝ sinc²(α)[sin(Nβ)/(N sinβ)]²`; defaults λ=550 nm, d=5 μm, N=5, slit width=0.35 μm and L=1.5 m. Fraunhofer approximation.
- Dipole: `r=L sin²(θ)`; `B=μ₀m/(4πr³)√(1+3cos²θ)`; assumes an ideal dipole outside the magnet.

## Validation
- CI parses all inline app scripts, simulation-engine.js, Worker and config.
- Node smoke tests verify interference, induction, diffraction and dipole schemas and default controls.
- Syntax/CI success does not replace visual testing on the user's Android device.

## Next priorities
1. Verify diffraction and dipole visuals on Android; tune camera framing and line contrast from feedback.
2. Add a vector-field cross-section view with magnitude/direction indicators.
3. Add optical polarization or another wave-optics experiment after diffraction is confirmed.
4. Preserve the original visual language and mitosis simulation.
5. Keep all generated models within safe JSON specifications.

## Continuity
- User prefers concise Iraqi Arabic and practical changes, not decorative redesign.
- User is phone-first; keep geometry and particle counts low.
- Do not claim autonomous background execution or automatic new-chat handoff.
- Update this file after each stable release so a new conversation can resume from the latest project state.
