#!/usr/bin/env node
'use strict';

const path = require('node:path');
const dynamics = require(path.join(__dirname, '..', 'model', 'bicycle_dynamics.js'));
const referenceCasesLib = require(path.join(__dirname, '..', 'model', 'reference_cases.js'));

function parseSamples(argv) {
    const defaultSamples = 50000;
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--samples' && i + 1 < argv.length) {
            const parsed = Number.parseInt(argv[i + 1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                return parsed;
            }
        }
        if (arg.startsWith('--samples=')) {
            const parsed = Number.parseInt(arg.split('=')[1], 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                return parsed;
            }
        }
    }
    return defaultSamples;
}

function solveSteadyByLinear(params) {
    const { m, lf, lr, cf, cr, v, delta } = params;
    const steerRad = dynamics.degToRad(delta);

    const a11 = cf + cr;
    const a12 = (cf * lf / v) - (cr * lr / v) + (m * v);
    const b1 = cf * steerRad;

    const a21 = (lf * cf) - (lr * cr);
    const a22 = ((lf * lf * cf) + (lr * lr * cr)) / v;
    const b2 = lf * cf * steerRad;

    const det = a11 * a22 - a12 * a21;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12) {
        return null;
    }

    const beta = (b1 * a22 - b2 * a12) / det;
    const yawRate = (a11 * b2 - a21 * b1) / det;

    const alphaF = steerRad - beta - (lf * yawRate / v);
    const alphaR = -beta + (lr * yawRate / v);
    const fyf = cf * alphaF;
    const fyr = cr * alphaR;
    const ay = v * yawRate;

    return {
        beta: beta,
        yawRate: yawRate,
        ay: ay,
        alphaF: alphaF,
        alphaR: alphaR,
        fyf: fyf,
        fyr: fyr,
    };
}

function getResiduals(params, out) {
    const { m, lf, lr, cf, cr, v, delta } = params;
    const steerRad = dynamics.degToRad(delta);

    const fyf = cf * (steerRad - out.beta - (lf * out.psi_dot / v));
    const fyr = cr * (-out.beta + (lr * out.psi_dot / v));
    const forceResidual = (fyf + fyr) - (m * v * out.psi_dot);
    const momentResidual = (lf * fyf) - (lr * fyr);

    return { forceResidual, momentResidual };
}

function maxAbsDiff(a, b) {
    return Math.max(
        Math.abs(a.beta - b.beta),
        Math.abs(a.psi_dot - b.yawRate),
        Math.abs(a.ay - b.ay),
        Math.abs(a.alpha_f - b.alphaF),
        Math.abs(a.alpha_r - b.alphaR),
        Math.abs(a.F_yf - b.fyf),
        Math.abs(a.F_yr - b.fyr)
    );
}

function runValidation(samples) {
    const relaxedLimits = {
        aySoftLimit: 1e9,
        ayHardLimit: 1e9,
        angleSoftLimitDeg: 1e9,
        angleHardLimitDeg: 1e9,
    };

    const metrics = {
        samples,
        checked: 0,
        skippedInvalid: 0,
        symmetryChecked: 0,
        maxDiff: 0,
        maxForceResidual: 0,
        maxMomentResidual: 0,
        referenceCasesChecked: 0,
        referenceCasesFailed: 0,
        failures: [],
    };

    for (let i = 0; i < samples; i += 1) {
        const raw = {
            m: 500 + Math.random() * 2500,
            lf: 0.5 + Math.random() * 2.0,
            lr: 0.5 + Math.random() * 2.0,
            cf: 20000 + Math.random() * 130000,
            cr: 20000 + Math.random() * 130000,
            v: 1 + Math.random() * 49,
            delta: -10 + Math.random() * 20,
        };

        const out = dynamics.calculateVehicleDynamics(raw, relaxedLimits);
        if (out.status === 'invalid') {
            metrics.skippedInvalid += 1;
            continue;
        }

        const reference = solveSteadyByLinear(out.params);
        if (!reference) {
            metrics.failures.push('reference_solver_failed');
            continue;
        }

        metrics.checked += 1;

        const diff = maxAbsDiff(out, reference);
        metrics.maxDiff = Math.max(metrics.maxDiff, diff);

        const residuals = getResiduals(out.params, out);
        metrics.maxForceResidual = Math.max(metrics.maxForceResidual, Math.abs(residuals.forceResidual));
        metrics.maxMomentResidual = Math.max(metrics.maxMomentResidual, Math.abs(residuals.momentResidual));

        const mirrored = dynamics.calculateVehicleDynamics({ ...out.params, delta: -out.params.delta }, relaxedLimits);
        if (mirrored.status !== 'invalid') {
            metrics.symmetryChecked += 1;
            const oddChecks = [
                Math.abs(out.beta + mirrored.beta),
                Math.abs(out.psi_dot + mirrored.psi_dot),
                Math.abs(out.ay + mirrored.ay),
                Math.abs(out.alpha_f + mirrored.alpha_f),
                Math.abs(out.alpha_r + mirrored.alpha_r),
                Math.abs(out.F_yf + mirrored.F_yf),
                Math.abs(out.F_yr + mirrored.F_yr),
            ];
            const oddError = Math.max(...oddChecks);
            metrics.maxDiff = Math.max(metrics.maxDiff, oddError);
        }
    }

    const deterministicCase = dynamics.calculateVehicleDynamics({
        m: 1550,
        lf: 1.6,
        lr: 1.2,
        cf: 74000,
        cr: 60000,
        v: 22,
        delta: 6.3,
    });

    if (deterministicCase.status !== 'invalid') {
        metrics.failures.push('near_critical_case_not_invalid');
    }

    const referenceResults = referenceCasesLib.evaluateAllReferenceCases(dynamics);
    metrics.referenceCasesChecked = referenceResults.length;
    metrics.referenceCasesFailed = referenceResults.filter((entry) => !entry.pass).length;
    if (metrics.referenceCasesFailed > 0) {
        metrics.failures.push(`reference_case_mismatch:${metrics.referenceCasesFailed}`);
    }

    const epsilonDiff = 1e-5;
    const epsilonResidual = 1e-5;

    if (metrics.checked < Math.max(1000, Math.floor(samples * 0.5))) {
        metrics.failures.push('too_few_valid_samples');
    }
    if (metrics.maxDiff > epsilonDiff) {
        metrics.failures.push(`diff_above_threshold:${metrics.maxDiff}`);
    }
    if (metrics.maxForceResidual > epsilonResidual) {
        metrics.failures.push(`force_residual_above_threshold:${metrics.maxForceResidual}`);
    }
    if (metrics.maxMomentResidual > epsilonResidual) {
        metrics.failures.push(`moment_residual_above_threshold:${metrics.maxMomentResidual}`);
    }

    return metrics;
}

function main() {
    const samples = parseSamples(process.argv.slice(2));
    const metrics = runValidation(samples);

    console.log(JSON.stringify(metrics, null, 2));

    if (metrics.failures.length > 0) {
        process.exitCode = 1;
    }
}

main();
