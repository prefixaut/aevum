import { Token, TokenType, tokenize } from './tokenizer';

/**
 * An interface which represents the Schema of how the time is
 * parsed or consumed by aevum in order to format it correctly.
 */
export interface Time {
    positive?: boolean;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
}

export interface FormattingOptions {
    /** If elements should be allowed to be longer than the provided length */
    strictFormat?: boolean;
    /** If the time has a bigger unit, it'll automatically apply padding to the units below it */
    padding?: boolean;
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
        strictFormat: false,
        padding: false
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
     * @param content Any Number (not NaN/Infinite) or a Time Object.
     * @param options Options which should be applied when formatting the content
     */
    public format(
        content: number | Time,
        options: FormattingOptions = this.defaultOptions
    ): string {
        if (options != null) {
            options = { ...this.defaultOptions, ...options };
        }

        const time = this.toTime(content);
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

        const strictFormat = !!options.strictFormat;
        const padding = !!options.padding;
        // The content we build together
        let build = '';

        // Rendering all parts of the array and putting it into the build-string.
        for (let i = 0; i < arr.length; i++) {
            build += this.renderPart(arr[i], time, strictFormat, padding);
        }

        return build;
    }

    private shake(tokens: (string | Token)[]) {
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
                pushValueInto(
                    token,
                    hours,
                    minutes,
                    seconds,
                    milliseconds,
                    all
                );
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

            const formatTokens = token.format || [token];
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

    private toTime(content: number | Time): Time {
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
            if (tmp.milliseconds != null && (tmp.milliseconds > 999 || tmp.milliseconds < 0)) {
                throw new TypeError('The milliseconds have to be in the range of 0 and 999!');
            }
            if (tmp.seconds != null && (tmp.seconds > 59 || tmp.seconds < 0)) {
                throw new TypeError('The seconds have to be in the rangen of 0 and 59!');
            }
            if (tmp.minutes != null && (tmp.minutes > 59 || tmp.minutes < 0)) {
                throw new TypeError('The minutes have to be in the rangen of 0 and 59!');
            }
            if (tmp.hours != null && tmp.hours < 0) {
                throw new TypeError('The hours have to be greater than 0!');
            }
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

    private renderPart(
        part: string | Token,
        time: Time,
        strictFormat: boolean,
        padding: boolean
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
                ((part.type === TokenType.NEGATIVE && !time.positive) ||
                    (part.type === TokenType.POSITIVE && time.positive)) &&
                part.format != null
            ) {
                for (let i = 0; i < part.format.length; i++) {
                    build += this.renderPart(
                        part.format[i],
                        time,
                        strictFormat,
                        padding
                    );
                }
            }
            return build;
        }

        // Handle all the other types
        return this.renderTimeToken(part, time, strictFormat, padding);
    }

    private renderTimeToken(
        token: Token,
        time: Time,
        strictFormat: boolean,
        padding: boolean
    ) {
        let typeLength = 0;

        let aboveTypeLength = 0;

        if (token.type === TokenType.HOUR) {
            typeLength = time.hours || 0;
        } else if (token.type === TokenType.MINUTE) {
            typeLength = time.minutes || 0;
            aboveTypeLength = time.hours || 0;
        } else if (token.type === TokenType.SECOND) {
            typeLength = time.seconds || 0;
            aboveTypeLength = time.hours || time.minutes || 0;
        } else if (token.type === TokenType.MILLISECOND) {
            typeLength = time.milliseconds || 0;
            aboveTypeLength = time.hours || time.minutes || time.seconds || 0;
        }

        if (token.optional) {
            const renderAnyways = !strictFormat && typeLength === 0 && aboveTypeLength > 0;

            if (!renderAnyways || token.format == null) {
                return '';
            }

            let build = '';
            for (let i = 0; i < token.format.length; i++) {
                build += this.renderPart(
                    token.format[i],
                    time,
                    strictFormat,
                    padding
                );
            }
            return build;
        }

        // Store the token-length in new variable, since overriding
        // it would also change it in the compiled token list and
        // screw up length-calculations in the future.
        let tokenLength = token.length;
        if (padding && aboveTypeLength > 0) {
            tokenLength = TimeTypes[token.type];
        }

        const str = '' + typeLength;
        const paddingLength = tokenLength - str.length;

        if (paddingLength > 0 && (padding || !token.optional)) {
            return '0'.repeat(paddingLength) + str;
        } else if (strictFormat && str.length > tokenLength) {
            return str.substring(0, tokenLength);
        } else {
            return str;
        }
    }
}
