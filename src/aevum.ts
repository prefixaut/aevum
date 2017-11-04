import { Token, tokenize } from './tokenizer';

export interface Time {
    positive: boolean;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

export const TimeTypes: { [key: string]: number } = {
    h: -1,
    m: 2,
    s: 2,
    d: 3,
};

export class Aevum {

    private tokens: Array<string | Token>;
    private compiled: { [key: string]: Array<string | Token> };

    constructor(
        private formatString: string,
    ) {
        this.tokens = tokenize(formatString);
        this.compiled = this.shake(this.tokens);
    }

    public format(content: number | object, performPadding: boolean = false): string {
        const time = this.asTime(content);
        let build = '';
        let arr: Array<string | Token> = [];

        const keys = ['hours', 'minutes', 'seconds', 'milliseconds'];
        for (let i = 0; i < keys.length; i++) {
            if (!!keys[i]) {
                arr = this.compiled[keys[i]];
                break;
            }
        }

        const len = arr.length;
        for (let i = 0; i < len; i++) {
            const part = arr[i];

            if (typeof part === 'string') {
                build += part;
                continue;
            }

            if (part.type === '?') {
                if (time.positive) {
                    build += '+';
                } else if (!time.positive) {
                    build += '-';
                }
                continue;
            }

            build += this.formatTimePart(part.type, part.length, time, performPadding);
        }

        return build;
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

            const arrs = new Array<Array<string | Token>>();
            switch (t.type) {
                case 'd':
                    arrs.push(milliseconds);
                case 's':
                    arrs.push(seconds);
                case 'm':
                    arrs.push(minutes);
                case 'h':
                    arrs.push(hours);
            }

            const formatTokens = t.format || [t];
            const formatLength = formatTokens.length;
            for (let k = 0; k < formatLength; k++) {
                this.pushIntoAll(formatTokens[k], ...arrs);
            }
        }

        return {
            hours,
            minutes,
            seconds,
            milliseconds,
        };
    }

    private pushIntoAll(value: string | Token, ...arrs: Array<Array<string | Token>>) {
        arrs.forEach((arr) => {
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

            // Parse an timeing object from the number
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

    private formatTimePart(type: string, length: number, time: Time, padding: boolean) {
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
