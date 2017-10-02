module.exports = function (tokens) {
    var h = []
    var m = []
    var s = []
    var d = []

    function push(value, arrs) {
        for (var i = 0; i < arrs.length; i++) {
            arrs[i].push(value)
        }
    }

    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i]

        if (typeof t === 'string') {
            push(t, [h, m, s, d])
            continue
        }

        if (typeof t !== 'object' || t === null || Array.isArray(t)) {
            throw new TypeError('Invalid token "' + t + '"!')
        }

        if (!t.optional) {
            push(t, [h, m, s, d])
            continue
        }

        var arrs = []
        switch (t.type) {
            case 'd':
            case 'dd':
            case 'ddd':
                arrs.push(d)
            case 'ss':
            case 's':
                arrs.push(s)
            case 'mm':
            case 'm':
                arrs.push(m)
            case 'hh':
            case 'h':
                arrs.push(h)
        }

        var formatTokens = (t.hasOwnProperty('format')) ? t.format : [t]
        for (var k = 0; k < formatTokens.length; k++) {
            push(formatTokens[k], arrs)
        }
    }

    return {
        h: h,
        m: m,
        s: s,
        d: d
    }
}
