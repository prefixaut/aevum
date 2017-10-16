"use strict";
exports.__esModule = true;
function compile(tokens) {
    var h = new Array();
    var m = new Array();
    var s = new Array();
    var d = new Array();
    function push(value) {
        var arrs = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            arrs[_i - 1] = arguments[_i];
        }
        arrs.forEach(function (arr) {
            arr.push(value);
        });
    }
    var length = tokens.length;
    for (var i = 0; i < length; i++) {
        var t = tokens[i];
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
        var arrs = new Array();
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
        var formatTokens = (t.hasOwnProperty('format') && t.format != null) ? t.format : [t];
        var formatLength = formatTokens.length;
        for (var k = 0; k < formatLength; k++) {
            push.apply(void 0, [formatTokens[k]].concat(arrs));
        }
    }
    return {
        h: h,
        m: m,
        s: s,
        d: d
    };
}
exports.compile = compile;
