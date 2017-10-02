var tokenize = function(format) {
    var timesRegex = /^([h,m,s]{1,2}|[d]{1,3})$/i
    var formatRegex = /^\[([h,m,s]{1,2}|[d]{1,3})\]$/i
    var hashRegex = /([^\\])(#)/

    // Length of the format-string
    var len = format.length
    // If the next character should be escaped
    var esc = false
    // If it's currently inside of an bracket -> ()
    var bracket = false
    // If it's currently inside of an square-bracket -> []
    var square = false
    // If it expects a format coming up
    var expectFormat = false
    // If the format is inside of another format
    var nestedFormat = false
    // The nested-format content
    var nestedBuild = ''

    // The current string build
    var build = ''
    // Type of the current format that is being processed
    var type = null
    // If the format is optional or not
    var optional = null

    // The compiled array of items
    var tokens = []
    
    for (var i = 0; i < len; i++) {
        var c = format.charAt(i)

        if (expectFormat && !square && c !== '[') {
            throw new SyntaxError('Expected a format assignment at position: ' + i + '! Got "' + c + '" instead!')
        }

        // Ignore what's coming up, it's escaped
        if (esc) {
            esc = false
            build += c
            continue
        }

        // Escape the upcoming character
        if (c === '\\') {
            esc = true
            continue
        }

        if (c === '(') {
            if (bracket) {
                throw new SyntaxError('Invalid "("-Character at position: ' + i + '! You may only have one bracket open at a time!')
            }
            bracket = true
            // Push the current build and reset it
            tokens.push(build)
            build = ''
            continue
        }

        if (c === ')') {
            if (!bracket) {
                throw new SyntaxError('Invalid ")"-Character at position: ' + i + '! You may close only already opened brackets!')
            }

            if (formatRegex.test(build)) {
                // Remove square brackets
                type = (build.slice(1) + build.slice(-1)).toLowerCase()
                expectFormat = false
            } else if (timesRegex.test(build)) {
                type = build.toLowerCase()
                expectFormat = true
            } else {
                throw new SyntaxError('Invalid Brackets content "' + build + '"  at position: ' + i + '!')
            }

            bracket = false
            optional = true
            build = ''
            continue
        }

        if (c === '[') {
            if (nestedFormat) {
                throw new SyntaxError('Invalid "["-Character at position: ' + i + '! You may nest formats only once!')
            }
            
            if (square) {
                nestedFormat = true
                build += c
            } else {
                tokens.push(build)
                build = ''
                square = true
            }
            if (!(optional = expectFormat)) {
                type = null
            }
            continue
        }

        if (c === ']') {
            if (!square) {
                throw new SyntaxError('Invalid "]"-Character at position: ' + i + '! You may close only already opened formats!')
            }

            if (nestedFormat) {
                if (!timesRegex.test(nestedBuild)) {
                    throw new SyntaxError('Invalid Format content at position: ' + (i - nestedBuild.length) + '! A nested format may only be a time-format! Got "' + nestedBuild + '" instead!')
                }
                
                build += c
                nestedFormat = false
                nestedBuild = ''
                continue
            } else if (!expectFormat) {
                if (!timesRegex.test(build)) {
                    throw new SyntaxError('Invalid Format content at position: ' + (i - build.length) + '! The format may only be a time-format! Got "' + build + '" instead!')
                }

                type = build.toLowerCase()
                square = false
            } else {
                square = false
            }
            
            var f = {
                type: type,
                optional: optional,
            }
            if (expectFormat) {
                build = build.replace(hashRegex, '$1[' + type + ']')
                f.format = tokenize(build)
            } else if (optional) {
                f.format = '#'
            }
            build = ''
            expectFormat = false

            tokens.push(f)
            continue
        }

        if (nestedFormat) {
            nestedBuild += c
        }
        build += c
    }

    if (bracket || square) {
        throw new SyntaxError('Invalid Syntax: Some brackets are not closed properly!')
    }
    if (expectFormat) {
        throw new SyntaxError('Expected an format to follow, but reached the end of format-string!')
    }
    if (esc) {
        throw new SyntaxError('Expected a character to escape, but reached end of format-string!')
    }

    if (build !== '') {
        tokens.push(build)
    }

    return tokens
}

module.exports = tokenize 