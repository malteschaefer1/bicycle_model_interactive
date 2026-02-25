# Model Documentation

## Purpose

This project implements a stationary single-track vehicle model (Einspurmodell) for interactive exploration in the browser.

Main UI: `model/bicycle_model.html`

## Architecture

- `model/bicycle_dynamics.js`
- Parameter sanitization and clamping
- Core closed-form stationary model calculation
- Validity classification (`ok`, `warning`, `invalid`)

- `model/reference_cases.js`
- Reference scenarios with expected values and tolerances
- Shared by UI and automated checks

- `model/bicycle_model.html`
- Inputs, visualization canvas, outputs, status messages
- Reference-case table and one-click case loading

## Inputs And Ranges

- `m`: 500 to 3000 kg
- `l_f`: 0.5 to 2.5 m
- `l_r`: 0.5 to 2.5 m
- `c_f`: 20000 to 150000 N/rad
- `c_r`: 20000 to 150000 N/rad
- `v`: 1 to 50 m/s
- `delta`: -10 to 10 deg

`I_z` is shown but disabled in this stationary version (reserved for future transient model work).

## Outputs

- `beta` (Schwimmwinkel)
- `psi_dot` (Giergeschwindigkeit)
- `a_y` (Querbeschleunigung)
- `alpha_f`, `alpha_r` (Schräglaufwinkel)
- `F_yf`, `F_yr` (Seitenkräfte)
- critical speed (`v_krit`, finite only in certain parameter regions)

## Validity Logic

- `ok`: values inside intended operating assumptions
- `warning`: computable, but outside recommended soft limits
- `invalid`: unsafe or unstable numeric/physical region; outputs are zeroed and reason codes are shown

Hard checks include:

- near/over critical speed
- near-singular determinant
- non-finite outputs
- large-angle / high-acceleration hard limits

## Known Limits

- Stationary, linearized model only
- Not a full transient dynamics simulator
- Explicitly marked in UI as work in progress / not fully validated against all real-world scenarios

## Related Docs

- Validation details: `docs/model/VALIDATION.md`
- Background and assumptions: `docs/model/BACKGROUND.md`
- Getting started: `GETTING_STARTED.md`
- Contributing: `CONTRIBUTING.md`
