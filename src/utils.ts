import {
    FormattingOptions,
    OptimizedTime,
    Time,
    Token,
    TokenType
} from './common';

const limits = {
    milliseconds: 999,
    seconds: 59,
    minutes: 59,
    hours: -1,
};

export function optimizeTokens(tokens: (string | Token)[]) {
    const hours: (string | Token)[] = [];
    const minutes: (string | Token)[] = [];
    const seconds: (string | Token)[] = [];
    const milliseconds: (string | Token)[] = [];
    const all: (string | Token)[] = [];

    const length = tokens.length;
    for (let i = 0; i < length; i++) {
        const token = tokens[i];

        if (typeof token === 'string') {
            if (token !== '') {
                pushValueInto(
                    token,
                    hours,
                    minutes,
                    seconds,
                    milliseconds,
                    all
                );
            }
            continue;
        }

        const type = token.type;
        if (
            !token.optional ||
            type === TokenType.NEGATIVE ||
            type === TokenType.POSITIVE ||
            type === TokenType.RELATIVE
        ) {
            pushValueInto(token, hours, minutes, seconds, milliseconds, all);
            continue;
        }

        const arrays: (string | Token)[][] = [];
        switch (type) {
            case TokenType.MILLISECOND:
                arrays.push(milliseconds);
            case TokenType.SECOND:
                arrays.push(seconds);
            case TokenType.MINUTE:
                arrays.push(minutes);
            case TokenType.HOUR:
                arrays.push(hours);
        }

        const formatTokens = token.optional ? token.format : [token];
        const formatLength = formatTokens.length;
        for (let k = 0; k < formatLength; k++) {
            pushValueInto(formatTokens[k], ...arrays);
        }
    }

    return {
        hours,
        minutes,
        seconds,
        milliseconds,
        all
    };
}

export function toTime(content: number | Time): Time {
    let positive = true;
    const type = typeof content;

    if (
        type === 'undefined' ||
        content === null ||
        (type !== 'object' && type !== 'number')
    ) {
        throw new TypeError('The time has to be a number or an object!');
    }

    if (typeof content !== 'number') {
        const tmp = { positive: true, ...content };
        Object.keys(limits).forEach(limitTypeName => {
            const value = tmp[limitTypeName];
            const max = limits[limitTypeName];
            if (value != null && (value < 0 || (max > 0 && value > max))) {
                throw new TypeError(
                    `The ${limitTypeName} have to be in the range of 0 and ${max}!`
                );
            }
        });
        return tmp;
    }

    if (isNaN(content) || !isFinite(content)) {
        throw new TypeError('The number may not be NaN/Infinite!');
    }

    if (content < 0) {
        positive = false;
        content = content * -1;
    }

    // Remove floating-points
    content = content - (content % 1);

    // Parse an timing object from the number
    return {
        positive,
        hours: (content / 3600000) | 0,
        minutes: (content / 60000) % 60 | 0,
        seconds: (content / 1000) % 60 | 0,
        milliseconds: content % 1000 | 0
    };
}

export function pushValueInto<T>(value: T, ...arrays: (T)[][]) {
    arrays.forEach(arr => {
        arr.push(value);
    });
}

export function prepareError(
    errorTemplate: string,
    replace?: { [other: string]: any }
): string {
    let str = errorTemplate;
    const variables = {
        pos: this.startIndex + this.currentIndex,
        ...replace
    };
    Object.keys(variables).forEach(key => {
        str = str.replace('{' + key + '}', variables[key]);
    });
    return str;
}

export function optimizeTime(
    time: Time,
    options: FormattingOptions
): OptimizedTime {
    return {
        positive: time.positive || false,
        h: {
            value: time.hours || 0,
            aboveTypeValue: 0
        },
        m: {
            value: time.minutes || 0,
            aboveTypeValue: time.hours || 0
        },
        s: {
            value: time.seconds || 0,
            aboveTypeValue: time.hours || time.minutes || 0
        },
        d: {
            value: time.milliseconds || 0,
            aboveTypeValue: time.hours || time.minutes || time.seconds || 0
        }
    };
}
