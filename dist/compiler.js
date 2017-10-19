"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function compile(tokens) {
    const h = new Array();
    const m = new Array();
    const s = new Array();
    const d = new Array();
    function push(value, ...arrs) {
        arrs.forEach((arr) => {
            arr.push(value);
        });
    }
    const length = tokens.length;
    for (let i = 0; i < length; i++) {
        const t = tokens[i];
        if (typeof t === 'string') {
            push(t, h, m, s, d);
            continue;
        }
        if (typeof t !== 'object' || t === null || Array.isArray(t)) {
            throw new TypeError('Invalid token "' + t + '"!');
        }
        if (!t.optional) {
            push(t, h, m, s, d);
            continue;
        }
        const arrs = new Array();
        switch (t.type) {
            case 'd':
                arrs.push(d);
            case 's':
                arrs.push(s);
            case 'm':
                arrs.push(m);
            case 'h':
                arrs.push(h);
        }
        const formatTokens = (t.hasOwnProperty('format') && t.format != null) ? t.format : [t];
        const formatLength = formatTokens.length;
        for (let k = 0; k < formatLength; k++) {
            push(formatTokens[k], ...arrs);
        }
    }
    return {
        h,
        m,
        s,
        d,
    };
}
exports.compile = compile;
//# sourceMappingURL=compiler.js.map