# MUKHTABAR — Project Status

Last updated: 2026-11-25
Current UI asset version: v39

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
8. Magnetic dipole — analytic dipole field lines, a sampled 2D vector-arrow map, animated direction tracers and movable probe showing |B|, Bx and By; controls magnetic moment, probe radius, probe angle and line count.
9. Photoelectric effect — photon/electron visualization with threshold, maximum kinetic energy and stopping-voltage readouts.
10. Radioactive decay — stochastic nucleus lifetimes, visible remaining nuclei, radiation-event tracers and comparison with exponential expectation.
11. Bohr atomic spectrum — hydrogen-like ion energy levels, electron transitions, emitted/absorbed photon and calculated wavelength.
12. Blackbody radiation — Planck spectrum curve, Wien peak marker and Stefan–Boltzmann total power.
13. Sinusoidal wave, pendulum and generated 3D scene engines.

## Physics models
- Double slit: `I ∝ cos²(π d x / λL)`; defaults 550 nm, 0.25 mm separation and 1.5 m distance; expected fringe spacing 3.30 mm.
- Induction: `εmax = NBAω`; defaults B=0.8 T, A=0.04 m², N=100, ω=12 rad/s; expected peak emf 38.4 V.
- Diffraction: `I ∝ sinc²(α)[sin(Nβ)/(N sinβ)]²`; defaults λ=550 nm, d=5 μm, N=5, slit width=0.35 μm and L=1.5 m. Fraunhofer approximation.
- Dipole: `r=L sin²(θ)`; `B=μ₀m/(4πr³)√(1+3cos²θ)`; assumes an ideal dipole outside the magnet.

## Polarization experiment
- Engine ID: polarization
- Defaults: analyzer angle 35°, wavelength 550 nm, source intensity 100%.
- Model: Malus' law with unpolarized source; intensity after first polarizer is I₀/2, then I=(I₀/2)cos²θ.
- Displays two linear polarizers, rotating analyzer, light beam and output screen brightness.
- Assumes ideal polarizers; absorption, reflections and partial polarization are omitted.

## Photoelectric effect
- Engine ID: photoelectric
- Defaults: λ=365 nm, work function φ=2.3 eV, intensity=75%.
- Photon energy: Eγ=1239.841984/λ(nm) eV.
- Maximum kinetic energy: Kmax=max(0,Eγ−φ); numerical stopping potential equals Kmax in volts.
- Photon wavelength controls energy; intensity controls emitted-electron count, not kinetic energy.
- Assumptions: ideal surface with a single work function; electron energy distribution and surface details are not modelled.

## Radioactive decay
- Engine ID: decay
- Defaults: half-life 6 s, 200 nuclei, simulation rate 1×.
- Expected population: N(t)=N₀ exp(−λt), λ=ln(2)/T½.
- Individual nucleus lifetimes are sampled from an exponential distribution; observed counts fluctuate around expected counts.
- Visual tracers represent generic decay events, not a specific radiation type or isotope.

## AI routing
- The AI prompt now prefers existing built-in experiment cards (mitosis, projectile, orbit, interference, induction, diffraction, dipole, polarization, photoelectric, decay) rather than rebuilding them as generic scenes.

## Ready-made core models
- Tokamak, sinusoidal wave and pendulum are direct cards in the physics list, not AI-only generated scenes.
- Local demo matching and AI built-in routing recognize these experiment IDs.

## Bohr atomic spectrum
- Engine ID: bohr
- Defaults: Z=1, initial level nᵢ=3, final level n𝒇=2.
- Model: Eₙ=−13.605693 Z²/n² eV; ΔE=13.605693 Z²|1/n𝒇²−1/nᵢ²| eV; λ=1239.841984/ΔE nm.
- 3→2 for hydrogen produces the H-alpha line near 656 nm. 2→1 produces a UV line near 121.6 nm.
- Assumptions: hydrogen-like ions only; no multi-electron structure or fine structure.

## Blackbody radiation
- Engine ID: blackbody
- Defaults: T=5800 K, A=0.01 m².
- Planck spectral radiance: Bλ=2hc²/[λ⁵(exp(hc/λkT)−1)].
- Wien peak: λmax=2.897771955×10⁶/T nm.
- Stefan–Boltzmann power: P=σAT⁴.
- Displays relative Planck spectrum from 100 to 2400 nm and a hot emitter whose color follows temperature approximately.
- Assumes an ideal emitter with emissivity 1.

## Validation
- CI parses all inline app scripts, simulation-engine.js, Worker and config.
- Node smoke tests verify interference, induction, diffraction, dipole and polarization schemas and default controls.
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


## Latest engine integrity fix
- Corrected missing independent scene-branch headers for decay, photoelectric, polarization, dipole, diffraction and wave.
- Each dedicated experiment now runs in its own if/else-if branch rather than continuing into later experiment setup blocks.
- CI now checks that all dedicated scene branches remain present.


## Branch integrity
- Restored independent conditional branches for all dedicated renderers: tokamak, interference, induction, bohr, decay, photoelectric, polarization, dipole, diffraction, wave, blackbody and pendulum.
- CI now verifies all dedicated branch headers and tests key physics helpers.
