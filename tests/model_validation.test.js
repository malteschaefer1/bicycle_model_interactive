const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const cp = require('node:child_process');

const scriptPath = path.join(__dirname, '..', 'scripts', 'model_validation.js');

test('model validation script passes with medium sample set', () => {
    const output = cp.execFileSync('node', [scriptPath, '--samples', '10000'], {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    const summary = JSON.parse(output);
    assert.equal(Array.isArray(summary.failures), true);
    assert.equal(summary.failures.length, 0);
    assert.ok(summary.checked > 3000);
    assert.ok(summary.maxDiff <= 1e-5);
    assert.ok(summary.maxForceResidual <= 1e-5);
    assert.ok(summary.maxMomentResidual <= 1e-5);
    assert.ok(summary.referenceCasesChecked >= 3);
    assert.equal(summary.referenceCasesFailed, 0);
});
