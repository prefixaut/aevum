var tokenizer = require('./src/tokenizer')
var compiler = require('./src/compiler')

module.exports = function(format) {

    if (typeof format !== 'string') {
        throw new TypeError('The formatter requires a string format!')
    }

    var tokens = tokenizer(format)
    var compiled = compiler(tokens)

    var format = {
        _compiled: compiled,
        format: function(time) {
            if (typeof time === 'number') {
                if (time === NaN) {
                    throw new TypeError('The time may not be NaN!')
                }
                // Parse an timeing object from the number
                time = {
                    hours: (time / 3600000) | 0,
                    minutes: ((time / 60000) | 0) % 60,
                    seconds: ((time / 1000) | 0) % 60,
                    milliseconds: time % 1000,
                }
            }

            if (typeof time === 'object') {
                if (time === null) {
                    throw new TypeError('The time may not be null!')
                }
                if (Array.isArray(time)) {
                    throw new TypeError('The time may not be an array!')
                }
            }

            let build = ''
            let len = this._compiled.length

            for (var i = 0; i < len; i++) {
                var part = this._compiled[i]

                if (typeof part === 'string') {
                    build += part
                    continue
                }

                if (typeof part !== 'object' || part === null || Array.isArray(part)) {
                    throw new Error('The compiled data contains invalid parts!')
                }

                var value = 0
                var stillShow = false
                switch (part.type) {
                case 'hh':
                case 'h':
                    value = time.hours
                    break
                case 'mm':
                case 'm':
                    stillShow = time.hours > 0
                    value = time.minutes
                    break
                case 'ss':
                case 's':
                    stillShow = time.hours > 0 || time.minutes > 0
                    value = time.seconds
                    break
                case 'ddd':
                case 'dd':
                case 'd':
                    stillShow = time.hours > 0 || time.minutes > 0 || time.seconds > 0
                    value = time.milliseconds
                    break
                default:
                    throw new Error('Invalid type "' + part.type + '" in the compiled data!')
                }
                if (!part.optional || (part.optional && stillShow)) {
                    build += this._formatTimePart(part.type, value)
                }
            }

            console.log(build)

            return build
        },
        _formatTimePart(type, value) {
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