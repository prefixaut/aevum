import { Token, tokenize } from './tokenizer';

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
    d: 3,
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
    constructor(
        private formatString: string,
    ) {
        this.tokens = tokenize(formatString);
        this.compiled = this.shake(this.tokens);
    }

    /**
     * Formats the content into the format with which this Aevum-Object was
     * initialized.
     *
     * @param content Any Number (not NaN/Infinite) or an Object which represents an existing time-object.
     * @param performPadding If the time has a bigger unit, it'll automatically apply padding to the units below it.
     */
    public format(content: number | object, performPadding: boolean = false): string {
        // Builds the time object
        const time = this.asTime(content);
        // The content we build together
        let build = '';
        // The shook array that is being used.
        let arr: Array<string | Token> = [];
        // Keys for both the time and compiled object
        const keys = ['hours', 'minutes', 'seconds', 'milliseconds'];

        // Iterating over all keys, from biggest to smallest
        for (let i = 0; i < keys.length; i++) {
            // If the time is bigger than 0, take that array
            if (time[keys[i]] > 0) {
                arr = this.compiled[keys[i]];
                break;
            }
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
        if (part.type === '?') {
            return (time.positive) ? '+' : '-';
        }

        // Handle special type '+' and '-'
        if (part.type === '-' || part.type === '+') {
            let build = '';
            if ((part.type === '-' && !time.positive) || (part.type === '+' && time.positive)) {
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

    private shake(tokens: Array<string | Token>) {
        const hours = new Array<string | Token>();
        const minutes = new Array<string | Token>();
        const seconds = new Array<string | Token>();
        const milliseconds = new Array<string | Token>();

        const length = tokens.length;
        for (let i = 0; i < length; i++) {
            const t = tokens[i];

            if (typeof t === 'string') {
                this.pushIntoAll(t, hours, minutes, seconds, milliseconds);
                continue;
            }

            if (!t.optional || t.type === '-' || t.type === '+') {
                this.pushIntoAll(t, hours, minutes, seconds, milliseconds);
                continue;
            }

            const arrays = new Array<Array<string | Token>>();
            switch (t.type) {
                case 'd':
                    arrays.push(milliseconds);
                case 's':
                    arrays.push(seconds);
                case 'm':
                    arrays.push(minutes);
                case 'h':
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
        };
    }

    private pushIntoAll(value: string | Token, ...arrays: Array<Array<string | Token>>) {
        arrays.forEach((arr) => {
            arr.push(value);
        });
    }

    /**
     * Creates a Time-Object from an number/timestamp or from another object.
     *
     * @param data The number/timestamp or another object
     */
    private asTime(data: any): Time {
        let positive = true;
        if (typeof data === 'undefined' || data === null) {
            throw new TypeError('The time may not be null or undefined!');
        }

        if (typeof data === 'number') {
            if (isNaN(data)) {
                throw new TypeError('The number may not be NaN!');
            }

            if (!isFinite(data)) {
                throw new TypeError('The number may not be Infinite!');
            }

            if (data < 0) {
                positive = false;
                data = data * -1;
            }

            // Parse an timing object from the number
            return {
                positive,
                hours: (data / 3600000) | 0,
                minutes: ((data / 60000) | 0) % 60,
                seconds: ((data / 1000) | 0) % 60,
                milliseconds: data % 1000,
            };
        }

        if (typeof data === 'object') {
            if (Array.isArray(data)) {
                throw new TypeError('The time may not be an array!');
            }

            if (data.hasOwnProperty('positive')) {
                positive = !!data.positive;
            }
            const out = {
                positive,
            };

            const map = {
                hours: ['hours', 'hour', 'h'],
                minutes: ['minutes', 'minute', 'm'],
                seconds: ['seconds', 'second', 's'],
                milliseconds: ['milliseconds', 'millisecond', 'milli', 'd'],
            };
            const keys = Object.keys(map);
            for (let i = 0; i < keys.length; i++) {
                out[keys[i]] = this.getNumberField(data, map[keys[i]]);
            }

            return out as Time;
        }

        throw new TypeError(`Invalid type "${typeof data}"!`);
    }

    private getNumberField(obj: any, fields: string[]): number {
        for (let i = 0; i < fields.length; i++) {
            if (!obj.hasOwnProperty(fields[i])) {
                continue;
            }
            const value = obj[fields[i]];
            if (isNaN(value) || !isFinite(value)) {
                continue;
            }
            return value;
        }

        return 0;
    }

    private renderTimePart(type: string, length: number, time: Time, padding: boolean) {
        let value = 0;

        switch (type) {
            case 'h':
                value = time.hours || 0;
                break;
            case 'm':
                value = time.minutes || 0;
                break;
            case 's':
                value = time.seconds || 0;
                break;
            case 'd':
                value = time.milliseconds || 0;
                break;
        }

        if (padding) {
            let tmp = 0;
            switch (type) {
                case 'd':
                    if (tmp === 0) {
                        tmp = time.seconds || tmp;
                    }
                case 's':
                    if (tmp === 0) {
                        tmp = time.minutes || tmp;
                    }
                case 'm':
                    if (tmp === 0) {
                        tmp = time.hours || tmp;
                    }
            }
            if (tmp > 0) {
                length = TimeTypes[type];
            }
        }

        const str = value.toString();
        return '0'.repeat(length - str.length) + str;
    }
}
