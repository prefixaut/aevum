var tokenizer = require('./src/tokenizer')
var compiler = require('./src/compiler')

module.exports = function(formatString) {

    if (typeof formatString !== 'string') {
        throw new TypeError('The formatter requires a string format!')
    }

    var tokens = tokenizer(formatString)
    var compiled = compiler(tokens)

    var format = {
        _tokens: tokens,
        _compiled: compiled,
        asTime: function(data) {
            if (typeof data === 'undefined' || data === null) {
                throw new TypeError('The time may not be null/undefined!')
            }
            if (typeof data === 'number') {
                if (isNaN(data)) {
                    throw new TypeError('The time may not be NaN!')
                }
                // Parse an timeing object from the number
                return {
                    hours: (data / 3600000) | 0,
                    minutes: ((data / 60000) | 0) % 60,
                    seconds: ((data / 1000) | 0) % 60,
                    milliseconds: data % 1000,
                }
            }
            if (typeof data === 'object') {
                if (Array.isArray(data)) {
                    throw new TypeError('The time may not be an array!')
                }
                return Object.assign({
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    milliseconds: 0
                }, data)
            }
            throw new TypeError('Invalid type "' + typeof data + '"!')
        },
        format: function(data) {
            var time = this.asTime(data)
            var build = ''
            var arr = []
            
            if (time.hours > 0) {
                arr = this._compiled.h
            } else if (time.minutes > 0) {
                arr = this._compiled.m
            } else if (time.seconds > 0) {
                arr = this._compiled.s
            } else if (time.milliseconds > 0) {
                arr = this._compiled.d
            }

            var len = arr.length
            for (var i = 0; i < len; i++) {
                var part = arr[i]

                if (typeof part === 'string') {
                    build += part
                    continue
                }

                build += this._formatTimePart(part.type, time)
            }

            return build
        },
        _formatTimePart(type, time) {
            var value = 0

            switch (type) {
                case 'h':
                case 'hh':
                    value = time.hours
                    break
                case 'm':
                case 'mm':
                    value = time.minutes
                    break
                case 's':
                case 'ss':
                    value = time.seconds
                    break
                case 'd':
                case 'dd':
                case 'ddd':
                    value = time.milliseconds
                    break
            }

            switch (type) {
                case 'h':
                case 'm':
                case 's':
                    return (value > 0) ? value : ''
                case 'hh':
                case 'mm':
                case 'ss':
                    return (value < 10) ? '0' + value : value
                case 'd':
                    return (value > 0) ? value : ''
                case 'dd':
                    return (value < 10) ? '0' + value : value
                case 'ddd':
                    return (value < 10) ? '00' + value : ((value < 100) ? '0' + value :  value)
            }
        }
    }

    return format
}