export interface Token {
    type: string,
    length: number,
    optional: boolean,
    format?: Array<(string | Token)>,
}

type State = 'STRING' | 'ESCAPED' | 'IN-OPTIONAL' | 'REQUIRE-FORMAT' | 'IN-FORMAT' | 'IN-NESTED'

const numberRegex = /^\d+$/

const types: { [key: string]: number } = {
    h: -1,
    m: 2,
    s: 2,
    d: 3,
}

export function tokenize(format: string): Array<(string|Token)> {

    let oldState: State = 'STRING'
    let state: State = 'STRING'

    // Regex used to replace hashes with the format
    const hashRegex = /([^\\])(#)/

    // Length of the format-string
    const len = format.length

    // The nested-format content
    let nestedBuild = ''
    // The current string build
    let build = ''

    // Type of the current format that is being processed
    let type: string = ''
    let length: number = 0
    // If the format is optional or not
    let optional: boolean = false

    // The compiled array of items
    const tokens = new Array<(Token | string)>()

    for (let i = 0; i < len; i++) {
        const c = format.charAt(i)

        switch (state) {
            case 'REQUIRE-FORMAT':
                if (c !== '[') {
                    throw new SyntaxError(`Expected a format assignment at position: ${i}! Got "${c}" instead!`)
                }
                state = 'IN-FORMAT'
                break

            case 'ESCAPED':
                state = oldState
                build += c
                break

            case 'STRING':
                if (c === '\\') {
                    oldState = state
                    state = 'ESCAPED'
                    break
                }

                if (c === '(') {
                    state = 'IN-OPTIONAL'
                    if (build !== '') {
                        tokens.push(build)
                    }
                    build = ''
                    break
                }

                if (c === '[') {
                    state = 'IN-FORMAT'
                    if (build !== '') {
                        tokens.push(build)
                    }
                    build = ''
                    break
                }

                build += c
                break

            case 'IN-OPTIONAL':
                if (c === ')') {
                    if (build.length === 0) {
                        throw new SyntaxError(
                            `Invalid Syntax on position ${i}! Closed optional defintion without setting a type!`)
                    }

                    if (!types.hasOwnProperty(build[0])) {
                        throw new SyntaxError(`Unknown Type '${build[0]}' on position ${i}!`)
                    }

                    if (build.length > 1) {
                        length = verifyType(build, i)
                    } else {
                        length = 1
                    }

                    type = build[0]
                    state = 'REQUIRE-FORMAT'
                    optional = true
                    break
                }

                build += c
                break

            case 'IN-FORMAT':
                if (c === '\\') {
                    oldState = state
                    state = 'ESCAPED'
                    break
                }

                if (c === '[') {
                    state = 'IN-NESTED'
                    break
                }

                if (c === ']') {
                    if (!optional) {
                        if (build.length === 0) {
                            throw new SyntaxError(`Invalid Syntax on position ${i}! An format-block may not be empty!`)
                        }

                        if (!types.hasOwnProperty(build[0])) {
                            throw new SyntaxError(`Unknown Type '${build[0]}' on position ${i}!`)
                        }

                        if (build.length > 1) {
                            length = verifyType(build, i)
                        } else {
                            length = 1
                        }

                        type = build[0]
                    }

                    const token: Token = {
                        type,
                        length,
                        optional,
                    }

                    if (optional) {
                        token.format = tokenize(build)
                    }

                    tokens.push(token)
                    state = 'STRING'
                    optional = false
                }
                break

            case 'IN-NESTED':
                if (c === ']') {
                    if (nestedBuild.length === 0) {
                        throw new SyntaxError(`Invalid Syntax on position ${i}! An format-block may not be empty!`)
                    }

                    if (!types.hasOwnProperty(nestedBuild[0])) {
                        throw new SyntaxError(`Unknown Type '${nestedBuild[0]}' on position ${i}!`)
                    }

                    verifyType(nestedBuild, i)

                    build += `[${nestedBuild}]`
                    state = 'IN-FORMAT'
                    break
                }

                nestedBuild += c
                break
        }
    }

    if (state !== 'STRING') {
        throw new SyntaxError('Invalid Syntax! Unexpected end of format!')
    }

    return tokens
}

function verifyType(input: string, position: number): number {
    const type = input[0]
    let flag = false
    let numberBuild = ''
    length = 1

    for (let i = 1; i < input.length; i++) {
        const c = input[i]

        if (i === 1) {
            flag = numberRegex.test(c)
            if (flag) {
                numberBuild += c
            }
        }

        if (flag) {
            if (!numberRegex.test(c)) {
                throw new SyntaxError(`Invalid Type-Definition on position ${position + i}!` +
                    `You may not mix the length with characters!`)
            }
            numberBuild += c
            continue
        }
        if (c !== type) {
            throw new SyntaxError(`Invalid Type-Defintion on position ${position + i}!` +
                `You may not mix the types!`)
        }
        length++
    }

    if (flag) {
        length = parseInt(numberBuild, 10)
    }

    const max = types[type]
    if (max > 0 && length > max) {
        throw new SyntaxError(`Invalid Type-Definition on position ${position}!` +
            `The given length is bigger than allowed! Length: ${length}, Max: ${max}`)
    }

    return length
}
