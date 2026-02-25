(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.BicycleReferenceCases = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const REFERENCE_CASES = [
        {
            id: 'neutral-basis',
            label: 'Neutral-Basis',
            params: { m: 1500, lf: 1.2, lr: 1.6, cf: 80000, cr: 80000, v: 15, delta: 2.0 },
            expected: { status: 'ok', betaDeg: -0.1223, psiDotDeg: 8.8166, ay: 2.3082 },
            tolerance: { betaDeg: 0.05, psiDotDeg: 0.05, ay: 0.05 },
            note: 'Ausgewogener Basispunkt mit moderater Querbeschleunigung.',
        },
        {
            id: 'understeer-road',
            label: 'Untersteuernd',
            params: { m: 1600, lf: 1.3, lr: 1.5, cf: 70000, cr: 95000, v: 18, delta: 2.5 },
            expected: { status: 'ok', betaDeg: -0.6103, psiDotDeg: 10.6287, ay: 3.3391 },
            tolerance: { betaDeg: 0.05, psiDotDeg: 0.05, ay: 0.05 },
            note: 'Beispiel mit stabiler untersteuernder Tendenz.',
        },
        {
            id: 'oversteer-near',
            label: 'Übersteuerungsnah',
            params: { m: 1450, lf: 1.4, lr: 1.4, cf: 110000, cr: 70000, v: 20, delta: 2.0 },
            expected: { status: 'warning', betaDeg: -4.2410, psiDotDeg: 30.9237, ay: 10.7944 },
            tolerance: { betaDeg: 0.08, psiDotDeg: 0.08, ay: 0.08 },
            note: 'Hohe Querbeschleunigung, daher bewusst im Warnbereich.',
        },
        {
            id: 'slow-corner',
            label: 'Langsam',
            params: { m: 1500, lf: 1.2, lr: 1.6, cf: 80000, cr: 80000, v: 8, delta: 3.0 },
            expected: { status: 'ok', betaDeg: 1.0962, psiDotDeg: 8.0769, ay: 1.1278 },
            tolerance: { betaDeg: 0.05, psiDotDeg: 0.05, ay: 0.05 },
            note: 'Niedrige Geschwindigkeit mit klar linearem Verhalten.',
        },
    ];

    function evaluateReferenceCase(dynamicsLib, referenceCase) {
        const result = dynamicsLib.calculateVehicleDynamics(referenceCase.params);
        const actual = {
            status: result.status,
            betaDeg: dynamicsLib.radToDeg(result.beta),
            psiDotDeg: dynamicsLib.radToDeg(result.psi_dot),
            ay: result.ay,
        };

        const delta = {
            betaDeg: Math.abs(actual.betaDeg - referenceCase.expected.betaDeg),
            psiDotDeg: Math.abs(actual.psiDotDeg - referenceCase.expected.psiDotDeg),
            ay: Math.abs(actual.ay - referenceCase.expected.ay),
        };

        const tol = referenceCase.tolerance;
        const statusPass = actual.status === referenceCase.expected.status;
        const valuePass = delta.betaDeg <= tol.betaDeg
            && delta.psiDotDeg <= tol.psiDotDeg
            && delta.ay <= tol.ay;

        return {
            id: referenceCase.id,
            pass: statusPass && valuePass,
            statusPass: statusPass,
            valuePass: valuePass,
            delta: delta,
            actual: actual,
            expected: referenceCase.expected,
            tolerance: tol,
        };
    }

    function evaluateAllReferenceCases(dynamicsLib) {
        return REFERENCE_CASES.map(function (referenceCase) {
            return evaluateReferenceCase(dynamicsLib, referenceCase);
        });
    }

    return {
        REFERENCE_CASES: REFERENCE_CASES,
        evaluateReferenceCase: evaluateReferenceCase,
        evaluateAllReferenceCases: evaluateAllReferenceCases,
    };
}));
