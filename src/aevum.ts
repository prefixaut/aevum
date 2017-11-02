import { compile } from './compiler';
import { Token, tokenize } from './tokenizer';

export interface Time {
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
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
        this.compiled = compile(this.tokens);
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

    private asTime(data: number | object): Time {
        if (typeof data === 'undefined' || data === null) {
            throw new TypeError('The time may not be null/undefined!');
        }
        if (typeof data === 'number') {
            if (isNaN(data)) {
                throw new TypeError('The time may not be NaN!');
            }
            if (!isFinite(data)) {
                throw new TypeError('The number has to be finite!');
            }
            if (data < 0) {
                throw new TypeError('The number has to be positive!');
            }
            // Parse an timeing object from the number
            return {
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
            return Object.assign({
                hours: 0,
                minutes: 0,
                seconds: 0,
                milliseconds: 0,
            }, data);
        }
        throw new TypeError(`Invalid type "${typeof data}"!`);
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
