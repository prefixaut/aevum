import { Token, TokenType, tokenize } from './tokenizer';

export interface Time {
    positive: boolean;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

/**
 * Constant to define Types for the tokenizer.
 * Each type is only one letter long and has the
 * maximum length as value.
 */
export const TimeTypes: { [key: string]: number } = {
    h: -1,
    m: 2,
    s: 2,
    d: 3
};

export class Aevum {
    /**
     * Parsed tokens
     */
    private tokens: Array<string | Token>;
    /**
     * Shook tokens mapped by the time-keys.
     */
    private compiled: { [key: string]: Array<string | Token> };

    /**
     * Creates an Aevum-Object with the given format-string.
     * Upon initializing a new Aevum-Object, it'll parse the format-string
     * as well as shake the parsed content and saves it.
     *
     * @param formatString Format String string according to the Documentation.
     * @see https://github.com/prefixaut/aevum
     */
    constructor(formatString: string) {
        this.tokens = tokenize(formatString);
        this.compiled = this.shake(this.tokens);
    }

    /**
     * Formats the content into the format with which this Aevum-Object was
     * initialized.
     *
     * @param content Any Number (not NaN/Infinite) or an Object which represents an existing time-object.
     * @param performPadding If the time has a bigger unit, it'll automatically apply padding to the units below it.
     * @param safe If the content is safe to get without transformations.
     */
    public format(content: number | object, performPadding: boolean = false, safe: boolean = false): string {
        let time: Time | null = null;
        let positive = true;

        if (typeof content === 'undefined' || content === null) {
            throw new TypeError('The time may not be null or undefined!');
        } else if (typeof content === 'number') {
            if (!safe) {
                if (isNaN(content)) {
                    throw new TypeError('The number may not be NaN!');
                }

                if (!isFinite(content)) {
                    throw new TypeError('The number may not be Infinite!');
                }
            }

            if (content < 0) {
                positive = false;
                content = content * -1;
            }

            // Remove floating-points
            content = content - (content % 1);

            // Parse an timing object from the number
            time = {
                positive,
                hours: (content / 3600000) | 0,
                minutes: (content / 60000) % 60 | 0,
                seconds: (content / 1000) % 60 | 0,
                milliseconds: content % 1000 | 0
            };
        } else if (typeof content === 'object') {
            if (safe) {
                time = content as Time;
            } else {
                if (Array.isArray(content)) {
                    throw new TypeError('The time may not be an array!');
                }

                if ('positive' in content) {
                    positive = !!(content as any).positive;
                }

                const out = {
                    positive
                };

                const map = {
                    hours: ['hours', 'hour', 'h'],
                    minutes: ['minutes', 'minute', 'm'],
                    seconds: ['seconds', 'second', 's'],
                    milliseconds: ['milliseconds', 'millisecond', 'milli', 'd']
                };

                const keys = Object.keys(map); // tslint:disable-line
                for (let i = 0; i < keys.length; i++) {
                    const obj = map[keys[i]];

                    for (let k = 0; k < obj.length; k++) {
                        if (!content.hasOwnProperty(obj[k])) {
                            continue;
                        }
                        const value = content[obj[k]];
                        if (isNaN(value) || !isFinite(value)) {
                            continue;
                        }
                        out[keys[i]] = value - (value % 1);
                    }
                }

                time = out as Time;
            }
        } else {
            throw new TypeError(`Invalid type "${typeof content}"!`);
        }

        // Never happens
        if (time == null) {
            throw new Error();
        }

        // The content we build together
        let build = '';
        // The shook array that is being used.
        let arr: (string | Token)[] = [];
        // Keys for both the time and compiled object
        const keys = ['hours', 'minutes', 'seconds', 'milliseconds'];
        // Flag if `arr` has changed
        let flag = false;

        // Iterating over all keys, from biggest to smallest
        for (let i = 0; i < keys.length; i++) {
            // If the time is bigger than 0, take that array
            if (time[keys[i]] > 0) {
                arr = this.compiled[keys[i]];
                flag = true;
                break;
            }
        }

        if (!flag) {
            arr = this.compiled.all;
        }

        // Rendering all parts of the array and putting it into the build-string.
        for (let i = 0; i < arr.length; i++) {
            build += this.renderPart(arr[i], time, performPadding);
        }

        return build;
    }

    private renderPart(part: string | Token, time: Time, padding: boolean): string {
        if (typeof part === 'string') {
            return part;
        }

        // Handle special type '?'
        if (part.type === TokenType.RELATIVE) {
            return time.positive ? TokenType.POSITIVE : TokenType.NEGATIVE;
        }

        // Handle special type '+' and '-'
        if (part.type === TokenType.NEGATIVE || part.type === TokenType.POSITIVE) {
            let build = '';
            if (
                (part.type === TokenType.NEGATIVE && !time.positive) ||
                (part.type === TokenType.POSITIVE && time.positive)
            ) {
                if (part.format != null) {
                    for (let i = 0; i < part.format.length; i++) {
                        build += this.renderPart(part.format[i], time, padding);
                    }
                }
            }
            return build;
        }

        // Handle all the other types
        return this.renderTimePart(part.type, part.length, time, padding);
    }

    private shake(tokens: (string | Token)[]) {
        const hours: (string | Token)[] = [];
        const minutes: (string | Token)[] = [];
        const seconds: (string | Token)[] = [];
        const milliseconds: (string | Token)[] = [];
        const all: (string | Token)[] = [];

        const length = tokens.length;
        for (let i = 0; i < length; i++) {
            const t = tokens[i];

            if (typeof t === 'string') {
                this.pushIntoAll(t, hours, minutes, seconds, milliseconds, all);
                continue;
            }

            if (!t.optional) {
                this.pushIntoAll(t, hours, minutes, seconds, milliseconds, all);
                continue;
            }

            if (t.type === TokenType.NEGATIVE || t.type === TokenType.POSITIVE) {
                this.pushIntoAll(t, hours, minutes, seconds, milliseconds);
                continue;
            }

            const arrays: (string | Token)[][] = [];
            switch (t.type) {
                case TokenType.MILLISECOND:
                    arrays.push(milliseconds);
                case TokenType.SECOND:
                    arrays.push(seconds);
                case TokenType.MINUTE:
                    arrays.push(minutes);
                case TokenType.HOUR:
                    arrays.push(hours);
            }

            const formatTokens = t.format || [t];
            const formatLength = formatTokens.length;
            for (let k = 0; k < formatLength; k++) {
                this.pushIntoAll(formatTokens[k], ...arrays);
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

    private pushIntoAll(value: string | Token, ...arrays: (string | Token)[][]) {
        arrays.forEach(arr => {
            arr.push(value);
        });
    }

    private renderTimePart(type: string, length: number, time: Time, padding: boolean) {
        let value = 0;

        switch (type) {
            case TokenType.HOUR:
                value = time.hours || 0;
                break;
            case TokenType.MINUTE:
                value = time.minutes || 0;
                break;
            case TokenType.SECOND:
                value = time.seconds || 0;
                break;
            case TokenType.MILLISECOND:
                value = time.milliseconds || 0;
                break;
        }

        if (padding) {
            let tmp = 0;
            switch (type) {
                case TokenType.MILLISECOND:
                    if (tmp === 0) {
                        tmp = time.seconds || tmp;
                    }
                case TokenType.SECOND:
                    if (tmp === 0) {
                        tmp = time.minutes || tmp;
                    }
                case TokenType.MINUTE:
                    if (tmp === 0) {
                        tmp = time.hours || tmp;
                    }
            }
            if (tmp > 0) {
                length = TimeTypes[type];
            }
        }

        let str = value.toString();
        const len = length - str.length;
        for (let i = 0; i < len; i++) {
            str = '0' + str;
        }
        return str;
    }
}
