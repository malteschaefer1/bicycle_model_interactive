const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const dynamics = require(path.join(__dirname, '..', 'model', 'bicycle_dynamics.js'));
const referenceCasesLib = require(path.join(__dirname, '..', 'model', 'reference_cases.js'));

test('reference case definitions are present and unique', () => {
    const ids = referenceCasesLib.REFERENCE_CASES.map((entry) => entry.id);
    const unique = new Set(ids);

    assert.ok(referenceCasesLib.REFERENCE_CASES.length >= 3);
    assert.equal(ids.length, unique.size);
});

test('all reference cases pass expected value checks', () => {
    for (const referenceCase of referenceCasesLib.REFERENCE_CASES) {
        const evaluation = referenceCasesLib.evaluateReferenceCase(dynamics, referenceCase);
        assert.equal(evaluation.pass, true, `reference case failed: ${referenceCase.id}`);
    }
});

test('HTML includes reference case table hooks', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'model', 'bicycle_model.html'), 'utf8');

    assert.match(html, /<script src="\.\/reference_cases\.js"><\/script>/);
    assert.match(html, /id="reference-case-table-body"/);
    assert.match(html, /Referenzfälle & Selbsttest/);
});
