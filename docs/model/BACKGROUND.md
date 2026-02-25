# Model Background

## English

This project implements a stationary linear bicycle model (single-track model) for cornering analysis.
It is useful for education and parameter sensitivity studies.

### Core Assumptions

- Constant forward speed `v`
- Small slip angles (linear tire model)
- Constant steering input `delta`
- Flat road, no transient effects

### Main Quantities

- `beta`: sideslip angle at center of gravity
- `psi_dot`: yaw rate
- `a_y`: lateral acceleration
- `alpha_f`, `alpha_r`: front/rear slip angles
- `F_yf`, `F_yr`: lateral tire forces

### Why Validity States Exist

Linear stationary formulas can produce numerically large or physically implausible values near critical conditions.
This project explicitly returns:

- `ok`: inside intended regime
- `warning`: computable but outside soft limits
- `invalid`: outside safe/meaningful numeric region

## Deutsch

Dieses Projekt nutzt ein stationaeres lineares Einspurmodell zur Kurvenfahrtanalyse.
Es eignet sich fuer Lehre und Parametersensitivitaet.

### Zentrale Annahmen

- Konstante Vorwaertsgeschwindigkeit `v`
- Kleine Schraeglaufwinkel (lineares Reifenmodell)
- Konstanter Lenkwinkel `delta`
- Ebene Fahrbahn, keine instationaeren Effekte

### Wichtige Groessen

- `beta`: Schwimmwinkel im Schwerpunkt
- `psi_dot`: Giergeschwindigkeit
- `a_y`: Querbeschleunigung
- `alpha_f`, `alpha_r`: Schraeglaufwinkel vorne/hinten
- `F_yf`, `F_yr`: Seitenkraefte vorne/hinten

## References

- Riekert, P., and Schunck, E. (1940): Zur Fahrmechanik des gummibereiften Kraftfahrzeugs.
- Standard vehicle dynamics textbooks covering linear bicycle models.

## Related Files

- `model/bicycle_dynamics.js`
- `model/reference_cases.js`
- `docs/model/README.md`
- `docs/model/VALIDATION.md`
