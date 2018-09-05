import { Token, TokenType, tokenize } from './tokenizer';

/**
 * An interface which represents the Schema of how the time is
 * parsed or consumed by aevum in order to format it correctly.
 */
export interface Time {
    positive: boolean;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

export interface FormattingOptions {
    /** If elements should be allowed to be longer than the provided length */
    expand?: boolean;
    /** If the time has a bigger unit, it'll automatically apply padding to the units below it */
    padding?: boolean;
    /** If the content is safe to get without transformations */
    safe?: boolean;
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

function pushValueInto<T>(value: T, ...arrays: (T)[][]) {
    arrays.forEach(arr => {
        arr.push(value);
    });
}

/**
 * Class which represents an Aevum formatter.
 * On initialization it's parsing the provided format which can then be
 * used to format a time.
 */
export class Aevum {
    /**
     * Parsed tokens
     */
    private tokens: Array<string | Token>;
    /**
     * Shook tokens mapped by the time-keys.
     */
    private compiled: { [key: string]: Array<string | Token> };

    private readonly defaultOptions: FormattingOptions = {
        expand: true,
        padding: false,
        safe: false
    };

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
     * @param options Options which should be applied when formatting the content
     */
    public format(
        content: number | object,
        options: FormattingOptions = this.defaultOptions
    ): string {
        if (options != null) {
            options = { ...this.defaultOptions, ...options };
        }
        const time = this.toTime(content, !!options.safe);

        // The content we build together
        let build = '';
        // The shook array that is being used.
        let arr: (string | Token)[] = [];
        // Keys for both the time and compiled object
        const keys = ['hours', 'minutes', 'seconds', 'milliseconds'];
        // If the array was set properly
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

        // If it couldn't find a time-array, just use the 'all'
        if (!flag) {
            arr = this.compiled.all;
        }

        // Rendering all parts of the array and putting it into the build-string.
        for (let i = 0; i < arr.length; i++) {
            build += this.renderPart(arr[i], time, options);
        }

        return build;
    }

    private toTime(content: number | object, safe: boolean): Time {
        let positive = true;

        const type = typeof content;
        if (type === 'undefined' || content === null) {
            throw new TypeError('The time may not be null or undefined!');
        }
        if (type !== 'number' && type !== 'object') {
            throw new TypeError(`Invalid type "${type}"!`);
        }

        if (typeof content === 'number') {
            if (!safe) {
                if (isNaN(content) || !isFinite(content)) {
                    throw new TypeError('The number may not be NaN/Infinite!');
                }
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

        if (safe) {
            return content as Time;
        }

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

        return out as Time;
    }

    private renderPart(
        part: string | Token,
        time: Time,
        options: FormattingOptions
    ): string {
        if (typeof part === 'string') {
            return part;
        }

        // Handle special type '?'
        if (part.type === TokenType.RELATIVE) {
            return time.positive ? TokenType.POSITIVE : TokenType.NEGATIVE;
        }

        // Handle special type '+' and '-'
        if (
            part.type === TokenType.NEGATIVE ||
            part.type === TokenType.POSITIVE
        ) {
            let build = '';
            if (
                !part.optional ||
                (part.optional &&
                    ((part.type === TokenType.NEGATIVE && !time.positive) ||
                        (part.type === TokenType.POSITIVE && time.positive)))
            ) {
                if (part.format != null) {
                    for (let i = 0; i < part.format.length; i++) {
                        build += this.renderPart(part.format[i], time, options);
                    }
                }
            }
            return build;
        }

        // Handle all the other types
        return this.renderToken(part, time, options);
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
            let pushToAll = false;

            if (typeof t === 'string') {
                pushToAll = true;

                continue;
            } else {
                if (
                    !t.optional ||
                    t.type === TokenType.NEGATIVE ||
                    t.type === TokenType.POSITIVE ||
                    t.type === TokenType.RELATIVE
                ) {
                    pushToAll = true;
                }
            }

            if (pushToAll) {
                pushValueInto(t, hours, minutes, seconds, milliseconds, all);
                continue;
            }

            const arrays: (string | Token)[][] = [];
            switch (t.type) {
                case TokenType.NEGATIVE:
                case TokenType.POSITIVE:
                case TokenType.RELATIVE:
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

    private renderToken(token: Token, time: Time, options: FormattingOptions) {
        let typeLength = 0;
        let renderAnyways = false;

        switch (token.type) {
            case TokenType.HOUR:
                typeLength = time.hours || 0;
                break;
            case TokenType.MINUTE:
                typeLength = time.minutes || 0;
                break;
            case TokenType.SECOND:
                typeLength = time.seconds || 0;
                break;
            case TokenType.MILLISECOND:
                typeLength = time.milliseconds || 0;
                break;
        }

        if (!!options.padding || (!!options.expand && typeLength === 0)) {
            let aboveType = 0;
            switch (token.type) {
                case TokenType.MILLISECOND:
                    if (aboveType === 0) {
                        aboveType = time.seconds || aboveType;
                    }
                case TokenType.SECOND:
                    if (aboveType === 0) {
                        aboveType = time.minutes || aboveType;
                    }
                case TokenType.MINUTE:
                    if (aboveType === 0) {
                        aboveType = time.hours || aboveType;
                    }
            }
            if (aboveType > 0) {
                renderAnyways = true;
                if (!!options.padding) {
                    token.length = TimeTypes[token.type];
                }
            }
        }

        if (token.optional) {
            if (
                (typeLength === 0 && !renderAnyways) ||
                !Array.isArray(token.format)
            ) {
                return '';
            }
            return token.format
                .map(nestedPart => this.renderPart(nestedPart, time, options))
                .join('');
        }

        let str = typeLength.toString();
        const paddingLength = token.length - str.length;

        if (paddingLength > 0 && !!options.padding) {
            for (let i = 0; i < paddingLength; i++) {
                str = '0' + str;
            }
            return str;
        } else if (!options.expand && str.length > token.length) {
            return str.substring(0, token.length);
        } else {
            return str;
        }
    }
}
