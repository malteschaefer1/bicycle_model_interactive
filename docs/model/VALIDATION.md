# Validation And Testing

## One-Command Quality Gate

```bash
./scripts/run_checks.sh
```

This command must pass before considering changes complete.

## What Is Checked

1. Unit and integration tests (`tests/*.test.js`)
- Parameter sanitization and bounds
- Stability and invalid-region handling
- Reference-case consistency
- HTML wiring checks

2. UI bootstrap/render test
- `tests/ui_render_bootstrap.test.js`
- Executes inline app script in a DOM/canvas stub
- Verifies drawing operations are issued and UI elements populate

3. Model validation loop
- `scripts/model_validation.js --samples 50000`
- Compares production closed-form outputs to an independent linear-system solver
- Checks force and moment residuals
- Checks symmetry under steering sign inversion
- Checks reference-case pass/fail results

## Reference Cases

Reference cases are defined in `model/reference_cases.js` and used in:

- UI table (`Referenzfälle & Selbsttest`)
- `tests/reference_cases.test.js`
- `scripts/model_validation.js`

This keeps one source of truth for expected values and tolerances.

## Automatic Fix Loop (When Something Fails)

1. Reproduce failure with the smallest relevant test.
2. Patch the smallest root cause.
3. Re-run focused tests.
4. Re-run full gate (`./scripts/run_checks.sh`).
5. Repeat until all checks are green.

## Related Commands

- Full model/test gate: `./scripts/run_checks.sh`
- Public release preflight: `./scripts/prepublish_check.sh`
