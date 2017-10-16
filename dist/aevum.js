"use strict";
exports.__esModule = true;
var compiler_1 = require("./compiler");
var tokenizer_1 = require("./tokenizer");
var Aevum = /** @class */ (function () {
    function Aevum(formatString) {
        this.formatString = formatString;
        this.tokens = tokenizer_1.tokenize(formatString);
        this.compiled = compiler_1.compile(this.tokens);
    }
    Aevum.prototype.format = function (data) {
        var time = this.asTime(data);
        var build = '';
        var arr;
        if (time.hours && time.hours > 0) {
            arr = this.compiled.h;
        }
        else if (time.minutes && time.minutes > 0) {
            arr = this.compiled.m;
        }
        else if (time.seconds && time.seconds > 0) {
            arr = this.compiled.s;
        }
        else if (time.milliseconds && time.milliseconds > 0) {
            arr = this.compiled.d;
        }
        else {
            return '';
        }
        var len = arr.length;
        for (var i = 0; i < len; i++) {
            var part = arr[i];
            if (typeof part === 'string') {
                build += part;
                continue;
            }
            build += this.formatTimePart(part.type, part.length, time);
        }
        return build;
    };
    Aevum.prototype.asTime = function (data) {
        if (typeof data === 'undefined' || data === null) {
            throw new TypeError('The time may not be null/undefined!');
        }
        if (typeof data === 'number') {
            if (isNaN(data)) {
                throw new TypeError('The time may not be NaN!');
            }
            // Parse an timeing object from the number
            return {
                hours: (data / 3600000) | 0,
                minutes: ((data / 60000) | 0) % 60,
                seconds: ((data / 1000) | 0) % 60,
                milliseconds: data % 1000
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
                milliseconds: 0
            }, data);
        }
        throw new TypeError("Invalid type \"" + typeof data + "\"!");
    };
    Aevum.prototype.formatTimePart = function (type, length, time) {
        var value = 0;
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
        if (length === 1) {
            return value;
        }
        var str = value.toString();
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    };
    return Aevum;
}());
exports["default"] = Aevum;
