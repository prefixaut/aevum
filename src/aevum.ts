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

    public format(time: number | object, performPadding: boolean = false): string {
        const timeObj = this.asTime(time);
        let build = '';
        let arr: Array<string | Token>;

        if (timeObj.hours && timeObj.hours > 0) {
            arr = this.compiled.h;
        } else if (timeObj.minutes && timeObj.minutes > 0) {
            arr = this.compiled.m;
        } else if (timeObj.seconds && timeObj.seconds > 0) {
            arr = this.compiled.s;
        } else if (timeObj.milliseconds && timeObj.milliseconds > 0) {
            arr = this.compiled.d;
        } else {
            return '';
        }

        const len = arr.length;
        for (let i = 0; i < len; i++) {
            const part = arr[i];

            if (typeof part === 'string') {
                build += part;
                continue;
            }

            build += this.formatTimePart(part.type, part.length, timeObj, performPadding);
        }

        return build;
    }

    private shake(tokens: Array<string | Token>) {
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
