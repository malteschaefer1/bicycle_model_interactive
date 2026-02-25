const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const dynamics = require(path.join(__dirname, '..', 'model', 'bicycle_dynamics.js'));

function isFiniteOutput(out) {
    return ['beta', 'psi_dot', 'ay', 'alpha_f', 'alpha_r', 'F_yf', 'F_yr'].every((key) =>
        Number.isFinite(out[key])
    );
}

test('default parameters are finite and stay in non-invalid status', () => {
    const out = dynamics.calculateVehicleDynamics(dynamics.DEFAULT_PARAMS);
    assert.ok(isFiniteOutput(out));
    assert.notEqual(out.status, 'invalid');
    assert.equal(out.error, false);
});

test('sanitizeParamValue clamps and snaps to slider grid', () => {
    assert.equal(dynamics.sanitizeParamValue('v', 9999), 50);
    assert.equal(dynamics.sanitizeParamValue('v', -10), 1);
    assert.equal(dynamics.sanitizeParamValue('delta', 1.26), 1.3);
    assert.equal(dynamics.sanitizeParamValue('cf', 'not-a-number', 81000), 81000);
});

test('near-critical cases become invalid instead of exploding', () => {
    const out = dynamics.calculateVehicleDynamics({
        m: 1550,
        lf: 1.6,
        lr: 1.2,
        cf: 74000,
        cr: 60000,
        v: 22,
        delta: 6.3,
    });

    assert.equal(out.status, 'invalid');
    assert.equal(out.error, true);
    assert.ok(out.errors.includes('near_critical_speed') || out.errors.includes('critical_speed_exceeded'));
    assert.equal(out.ay, 0);
});

test('understeer/neutral setups can have infinite critical speed without invalid status', () => {
    const out = dynamics.calculateVehicleDynamics({
        m: 1500,
        lf: 1.2,
        lr: 1.6,
        cf: 80000,
        cr: 80000,
        v: 20,
        delta: 2,
    });

    assert.ok(Number.isFinite(out.ay));
    assert.equal(out.status === 'ok' || out.status === 'warning', true);
    assert.equal(Number.isFinite(out.criticalSpeed), false);
});

test('large but finite excitations produce warning/invalid, not silent ok', () => {
    const out = dynamics.calculateVehicleDynamics({
        m: 1200,
        lf: 1.0,
        lr: 2.0,
        cf: 120000,
        cr: 50000,
        v: 40,
        delta: 8,
    });

    assert.ok(out.status === 'warning' || out.status === 'invalid');
    assert.ok(isFiniteOutput(out));
});

test('red-team fuzz: outputs stay finite and bounded whenever status is not invalid', () => {
    const samples = 8000;

    for (let i = 0; i < samples; i += 1) {
        const randomInput = {
            m: 500 + Math.random() * 2600,
            lf: 0.4 + Math.random() * 2.5,
            lr: 0.4 + Math.random() * 2.5,
            cf: 15000 + Math.random() * 155000,
            cr: 15000 + Math.random() * 155000,
            v: -20 + Math.random() * 80,
            delta: -25 + Math.random() * 50,
        };

        const out = dynamics.calculateVehicleDynamics(randomInput);
        assert.ok(isFiniteOutput(out));

        if (out.status !== 'invalid') {
            assert.ok(Math.abs(out.ay) <= dynamics.VALIDATION_LIMITS.ayHardLimit);
            const maxAngleDeg = Math.max(
                Math.abs(dynamics.radToDeg(out.beta)),
                Math.abs(dynamics.radToDeg(out.alpha_f)),
                Math.abs(dynamics.radToDeg(out.alpha_r))
            );
            assert.ok(maxAngleDeg <= dynamics.VALIDATION_LIMITS.angleHardLimitDeg);
        }
    }
});

test('HTML is wired to local model module and has hardened external links', () => {
    const htmlPath = path.join(__dirname, '..', 'model', 'bicycle_model.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.match(html, /<script src="\.\/bicycle_dynamics\.js"><\/script>/);
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
});

test('legacy HTML files are archived under model/archive', () => {
    const root = path.join(__dirname, '..', 'model');
    const archive01 = path.join(root, 'archive', '01_old_bicycle.html');
    const archive02 = path.join(root, 'archive', '02_old_bicycle_wAI.html');
    const old01 = path.join(root, '01_old_bicycle.html');
    const old02 = path.join(root, '02_old_bicycle_wAI.html');

    assert.equal(fs.existsSync(archive01), true);
    assert.equal(fs.existsSync(archive02), true);
    assert.equal(fs.existsSync(old01), false);
    assert.equal(fs.existsSync(old02), false);
});
