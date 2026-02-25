# Reference Case Walkthrough

This short example helps new users understand one complete run.

## Input (Neutral-Basis)

- `m = 1500 kg`
- `l_f = 1.2 m`
- `l_r = 1.6 m`
- `c_f = 80000 N/rad`
- `c_r = 80000 N/rad`
- `v = 15 m/s`
- `delta = 2.0 deg`

## Expected Behavior

- Status is `ok`
- Moderate lateral acceleration
- Small sideslip angle

## How To Reproduce

1. Open `model/bicycle_model.html`.
2. In the reference-case table, click the row action for `Neutral-Basis`.
3. Compare output values with `model/reference_cases.js`.

## Why This Is Useful

- Gives a stable baseline before testing extreme parameters.
- Helps detect regressions quickly when making model changes.
