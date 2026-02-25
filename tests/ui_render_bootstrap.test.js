const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dynamics = require(path.join(__dirname, '..', 'model', 'bicycle_dynamics.js'));
const referenceCasesLib = require(path.join(__dirname, '..', 'model', 'reference_cases.js'));

class FakeClassList {
    constructor() {
        this.values = new Set();
    }

    add(value) {
        this.values.add(value);
    }
}

class FakeElement {
    constructor(tagName = 'div', id = '') {
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this.children = [];
        this._textContent = '';
        this.className = '';
        this.classList = new FakeClassList();
        this.style = {};
        this.attributes = {};
        this.listeners = {};
        this.parentElement = null;
    }

    appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    set textContent(value) {
        this._textContent = String(value);
        if (value === '') {
            this.children = [];
        }
    }

    get textContent() {
        return this._textContent;
    }

    addEventListener(type, handler) {
        this.listeners[type] = handler;
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }
}

function extractInlineScript(html) {
    const matches = html.match(/<script>([\s\S]*?)<\/script>/g);
    if (!matches || matches.length === 0) {
        throw new Error('No inline script found');
    }
    const last = matches[matches.length - 1];
    return last.replace(/^<script>/, '').replace(/<\/script>$/, '');
}

function createControl(id, type, value, min, max) {
    const el = new FakeElement('input', id);
    el.type = type;
    el.value = String(value);
    el.min = String(min);
    el.max = String(max);
    return el;
}

test('UI bootstrap draws onto canvas and populates outputs', () => {
    const htmlPath = path.join(__dirname, '..', 'model', 'bicycle_model.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const inlineScript = extractInlineScript(html);

    const elements = new Map();

    const outputContainer = new FakeElement('div', 'output-values');
    const statusContainer = new FakeElement('div', 'model-status');
    const refSummary = new FakeElement('div', 'reference-validation-summary');
    const refTableBody = new FakeElement('tbody', 'reference-case-table-body');

    elements.set('output-values', outputContainer);
    elements.set('model-status', statusContainer);
    elements.set('reference-validation-summary', refSummary);
    elements.set('reference-case-table-body', refTableBody);

    const controls = [
        ['mass-slider', 'range', 1500, 500, 3000],
        ['mass-input', 'number', 1500, 500, 3000],
        ['lf-slider', 'range', 1.2, 0.5, 2.5],
        ['lf-input', 'number', 1.2, 0.5, 2.5],
        ['lr-slider', 'range', 1.6, 0.5, 2.5],
        ['lr-input', 'number', 1.6, 0.5, 2.5],
        ['cf-slider', 'range', 80000, 20000, 150000],
        ['cf-input', 'number', 80000, 20000, 150000],
        ['cr-slider', 'range', 80000, 20000, 150000],
        ['cr-input', 'number', 80000, 20000, 150000],
        ['v-slider', 'range', 20, 1, 50],
        ['v-input', 'number', 20, 1, 50],
        ['delta-slider', 'range', 2, -10, 10],
        ['delta-input', 'number', 2, -10, 10],
    ];

    for (const [id, type, value, min, max] of controls) {
        elements.set(id, createControl(id, type, value, min, max));
    }

    const ctxOps = [];
    const fakeCtx = {
        setTransform: (...args) => ctxOps.push(['setTransform', ...args]),
        clearRect: (...args) => ctxOps.push(['clearRect', ...args]),
        save: () => ctxOps.push(['save']),
        restore: () => ctxOps.push(['restore']),
        beginPath: () => ctxOps.push(['beginPath']),
        moveTo: (...args) => ctxOps.push(['moveTo', ...args]),
        lineTo: (...args) => ctxOps.push(['lineTo', ...args]),
        stroke: () => ctxOps.push(['stroke']),
        fill: () => ctxOps.push(['fill']),
        closePath: () => ctxOps.push(['closePath']),
        arc: (...args) => ctxOps.push(['arc', ...args]),
        fillText: (...args) => ctxOps.push(['fillText', ...args]),
        fillRect: (...args) => ctxOps.push(['fillRect', ...args]),
        translate: (...args) => ctxOps.push(['translate', ...args]),
        rotate: (...args) => ctxOps.push(['rotate', ...args]),
        set font(value) { this._font = value; },
        get font() { return this._font; },
        set strokeStyle(value) { this._strokeStyle = value; },
        set lineWidth(value) { this._lineWidth = value; },
        set fillStyle(value) { this._fillStyle = value; },
    };

    const canvasParent = new FakeElement('div');
    canvasParent.getBoundingClientRect = () => ({ width: 900, height: 450 });

    const canvas = new FakeElement('canvas', 'vehicle-canvas');
    canvas.width = 0;
    canvas.height = 0;
    canvas.clientWidth = 900;
    canvas.clientHeight = 450;
    canvas.parentElement = canvasParent;
    canvas.getContext = () => fakeCtx;
    elements.set('vehicle-canvas', canvas);

    const document = {
        getElementById(id) {
            return elements.get(id) || null;
        },
        createElement(tagName) {
            return new FakeElement(tagName);
        },
    };

    const windowListeners = {};
    let rafId = 1;
    const errors = [];

    function addWindowListener(type, handler) {
        if (!windowListeners[type]) {
            windowListeners[type] = [];
        }
        windowListeners[type].push(handler);
    }

    const windowObject = {
        devicePixelRatio: 2,
        addEventListener: addWindowListener,
        requestAnimationFrame(callback) {
            callback();
            rafId += 1;
            return rafId;
        },
        cancelAnimationFrame() {},
        ResizeObserver: class {
            constructor(callback) {
                this.callback = callback;
            }

            observe() {
                this.callback();
            }
        },
    };

    const context = vm.createContext({
        window: windowObject,
        document,
        console: {
            error: (...args) => errors.push(args.join(' ')),
            log: () => {},
            warn: () => {},
        },
        Math,
        Number,
        parseFloat,
        requestAnimationFrame: windowObject.requestAnimationFrame.bind(windowObject),
        cancelAnimationFrame: windowObject.cancelAnimationFrame.bind(windowObject),
        ResizeObserver: windowObject.ResizeObserver,
    });

    windowObject.BicycleDynamics = dynamics;
    windowObject.BicycleReferenceCases = referenceCasesLib;

    vm.runInContext(inlineScript, context, { filename: '02_new_bicycle_woAI.inline.js' });

    for (const type of ['DOMContentLoaded', 'load']) {
        if (windowListeners[type]) {
            for (const handler of windowListeners[type]) {
                handler();
            }
        }
    }

    assert.equal(errors.length, 0, `Unexpected console errors: ${errors.join(' | ')}`);
    assert.ok(ctxOps.length > 30, 'Expected drawing operations to be issued');
    assert.ok(ctxOps.some((op) => op[0] === 'arc'), 'Expected arc draw operations');
    assert.ok(ctxOps.some((op) => op[0] === 'fillText'), 'Expected text draw operations');
    assert.ok(outputContainer.children.length >= 8, 'Expected output cards to be created');
    assert.equal(refTableBody.children.length, referenceCasesLib.REFERENCE_CASES.length);
});
