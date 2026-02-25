(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.BicycleDynamics = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const DEFAULT_PARAMS = {
        m: 1500,
        lf: 1.2,
        lr: 1.6,
        cf: 80000,
        cr: 80000,
        v: 20,
        delta: 2.0,
    };

    const PARAM_LIMITS = {
        m: { min: 500, max: 3000, step: 50 },
        lf: { min: 0.5, max: 2.5, step: 0.1 },
        lr: { min: 0.5, max: 2.5, step: 0.1 },
        cf: { min: 20000, max: 150000, step: 1000 },
        cr: { min: 20000, max: 150000, step: 1000 },
        v: { min: 1, max: 50, step: 1 },
        delta: { min: -10, max: 10, step: 0.1 },
    };

    const VALIDATION_LIMITS = {
        minSpeed: 0.1,
        criticalSpeedMarginInvalid: 0.005,
        criticalSpeedMarginWarning: 0.05,
        determinantRelativeMin: 1e-6,
        aySoftLimit: 4,
        ayHardLimit: 12,
        angleSoftLimitDeg: 8,
        angleHardLimitDeg: 25,
    };

    function degToRad(deg) {
        return deg * Math.PI / 180;
    }

    function radToDeg(rad) {
        return rad * 180 / Math.PI;
    }

    function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function decimalPlaces(step) {
        const text = String(step);
        if (!text.includes('.')) {
            return 0;
        }
        return text.split('.')[1].length;
    }

    function snapToStep(value, min, step) {
        if (!isFiniteNumber(step) || step <= 0) {
            return value;
        }
        const snapped = min + Math.round((value - min) / step) * step;
        const precision = Math.min(8, decimalPlaces(step) + 2);
        return Number(snapped.toFixed(precision));
    }

    function sanitizeParamValue(key, rawValue, fallbackValue) {
        const defaultValue = isFiniteNumber(fallbackValue) ? fallbackValue : DEFAULT_PARAMS[key];
        const limits = PARAM_LIMITS[key];

        let numeric = Number.parseFloat(rawValue);
        if (!isFiniteNumber(numeric)) {
            numeric = defaultValue;
        }

        if (!limits) {
            return numeric;
        }

        const clamped = clamp(numeric, limits.min, limits.max);
        return snapToStep(clamped, limits.min, limits.step);
    }

    function sanitizeParams(rawParams) {
        const safeParams = {};
        const source = rawParams || {};

        Object.keys(DEFAULT_PARAMS).forEach(function (key) {
            const fallback = DEFAULT_PARAMS[key];
            safeParams[key] = sanitizeParamValue(key, source[key], fallback);
        });

        return safeParams;
    }

    function zeroedResult(params, status, errors, warnings, details) {
        return {
            beta: 0,
            psi_dot: 0,
            ay: 0,
            alpha_f: 0,
            alpha_r: 0,
            F_yf: 0,
            F_yr: 0,
            criticalSpeed: details && 'criticalSpeed' in details ? details.criticalSpeed : Infinity,
            determinant: details && 'determinant' in details ? details.determinant : null,
            status: status,
            error: status === 'invalid',
            errors: errors || [],
            warnings: warnings || [],
            params: params,
        };
    }

    function calculateVehicleDynamics(rawParams, validationOverrides) {
        const params = sanitizeParams(rawParams);
        const limits = Object.assign({}, VALIDATION_LIMITS, validationOverrides || {});

        const m = params.m;
        const lf = params.lf;
        const lr = params.lr;
        const cf = params.cf;
        const cr = params.cr;
        const v = params.v;
        const deltaRad = degToRad(params.delta);
        const wheelbase = lf + lr;

        const errors = [];
        const warnings = [];

        if (v < limits.minSpeed) {
            errors.push('speed_too_low');
            return zeroedResult(params, 'invalid', errors, warnings, { criticalSpeed: Infinity });
        }

        const criticalDenominator = m * (lf * cf - lr * cr);
        let criticalSpeed = Infinity;

        if (criticalDenominator > 0) {
            const criticalSpeedSquared = (cf * cr * wheelbase * wheelbase) / criticalDenominator;
            criticalSpeed = Math.sqrt(criticalSpeedSquared);

            if (!isFiniteNumber(criticalSpeed) || criticalSpeed <= 0) {
                errors.push('critical_speed_not_finite');
                return zeroedResult(params, 'invalid', errors, warnings, { criticalSpeed: criticalSpeed });
            }

            const margin = (criticalSpeed - v) / criticalSpeed;
            if (margin <= 0) {
                errors.push('critical_speed_exceeded');
                return zeroedResult(params, 'invalid', errors, warnings, { criticalSpeed: criticalSpeed });
            }
            if (margin < limits.criticalSpeedMarginInvalid) {
                errors.push('near_critical_speed');
                return zeroedResult(params, 'invalid', errors, warnings, { criticalSpeed: criticalSpeed });
            }
            if (margin < limits.criticalSpeedMarginWarning) {
                warnings.push('approaching_critical_speed');
            }
        }

        const determinant = ((cf * cr * wheelbase * wheelbase) / v) - (m * v * (lf * cf - lr * cr));
        const determinantScale = Math.max(
            1,
            Math.abs((cf * cr * wheelbase * wheelbase) / v),
            Math.abs(m * v * (lf * cf - lr * cr))
        );
        const determinantRelative = Math.abs(determinant) / determinantScale;

        if (!isFiniteNumber(determinant) || determinantRelative < limits.determinantRelativeMin) {
            errors.push('determinant_too_small');
            return zeroedResult(params, 'invalid', errors, warnings, {
                criticalSpeed: criticalSpeed,
                determinant: determinant,
            });
        }

        const psiDot = (cf * cr * wheelbase * deltaRad) / determinant;
        const beta = (cf * deltaRad * (((lr * cr * wheelbase) / v) - (m * v * lf))) / determinant;
        const alphaF = deltaRad - beta - (lf * psiDot) / v;
        const alphaR = -beta + (lr * psiDot) / v;
        const fyf = cf * alphaF;
        const fyr = cr * alphaR;
        const ay = v * psiDot;

        const computed = [beta, psiDot, ay, alphaF, alphaR, fyf, fyr];
        if (!computed.every(isFiniteNumber)) {
            errors.push('non_finite_output');
            return zeroedResult(params, 'invalid', errors, warnings, {
                criticalSpeed: criticalSpeed,
                determinant: determinant,
            });
        }

        const maxAngleDeg = Math.max(
            Math.abs(radToDeg(beta)),
            Math.abs(radToDeg(alphaF)),
            Math.abs(radToDeg(alphaR)),
            Math.abs(params.delta)
        );

        if (Math.abs(ay) > limits.ayHardLimit) {
            errors.push('ay_hard_limit_exceeded');
        } else if (Math.abs(ay) > limits.aySoftLimit) {
            warnings.push('outside_ay_limit');
        }

        if (maxAngleDeg > limits.angleHardLimitDeg) {
            errors.push('angle_hard_limit_exceeded');
        } else if (maxAngleDeg > limits.angleSoftLimitDeg) {
            warnings.push('outside_small_angle_limit');
        }

        if (errors.length > 0) {
            return zeroedResult(params, 'invalid', errors, warnings, {
                criticalSpeed: criticalSpeed,
                determinant: determinant,
            });
        }

        const status = warnings.length > 0 ? 'warning' : 'ok';
        return {
            beta: beta,
            psi_dot: psiDot,
            ay: ay,
            alpha_f: alphaF,
            alpha_r: alphaR,
            F_yf: fyf,
            F_yr: fyr,
            criticalSpeed: criticalSpeed,
            determinant: determinant,
            status: status,
            error: false,
            errors: [],
            warnings: warnings,
            params: params,
        };
    }

    return {
        DEFAULT_PARAMS: DEFAULT_PARAMS,
        PARAM_LIMITS: PARAM_LIMITS,
        VALIDATION_LIMITS: VALIDATION_LIMITS,
        degToRad: degToRad,
        radToDeg: radToDeg,
        isFiniteNumber: isFiniteNumber,
        sanitizeParamValue: sanitizeParamValue,
        sanitizeParams: sanitizeParams,
        calculateVehicleDynamics: calculateVehicleDynamics,
    };
}));
