import { Token } from './tokenizer';

export function compile(tokens: Array<string | Token>) {
    const h = new Array<string | Token>();
    const m = new Array<string | Token>();
    const s = new Array<string | Token>();
    const d = new Array<string | Token>();

    function push(value: string | Token, ...arrs: Array<Array<string | Token>>) {
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

        if (!t.optional) {
            push(t, h, m, s, d);
            continue;
        }

        const arrs = new Array<Array<string | Token>>();
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

        const formatTokens = t.format || [t];
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
