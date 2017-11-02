import { TimeTypes } from './aevum';

export interface Token {
    type: string;
    length: number;
    optional: boolean;
    format?: Array<(string | Token)>;
}

type State = 'STRING' | 'ESCAPED' | 'IN-OPTIONAL' | 'REQUIRE-FORMAT' | 'IN-FORMAT' | 'IN-NESTED';

const numberRegex = /^\d+$/;

export function tokenize(format: string): Array<(string | Token)> {

    let oldState = 'STRING' as State;
    let state = 'STRING' as State;

    // Regex used to replace hashes with the format
    const hashRegex = /([^\\])(#)/;

    // Length of the format-string
    const len = format.length;

    // The nested-format content
    let nestedBuild = '';
    // The current string build
    let build = '';

    // Type of the current format that is being processed
    let type: string = '';
    let length: number = 0;
    // If the format is optional or not
    let optional: boolean = false;

    // The compiled array of items
    const tokens = new Array<(Token | string)>();

    for (let i = 0; i < len; i++) {
        const c = format.charAt(i);

        switch (state) {
            case 'REQUIRE-FORMAT':
                if (c !== '[') {
                    throw new SyntaxError(`Expected a format assignment at position: ${i}! Got "${c}" instead!`);
                }
                state = 'IN-FORMAT';
                break;

            case 'ESCAPED':
                // Adding the backslash/escape character again, since the content
                // of an 'IN-FORMAT' will be tokenized again which causes the
                // content not to be escaped properly, as the escape doesn't
                // happen in the second round of the tokenizing
                if (oldState === 'IN-FORMAT') {
                    build += '\\';
                }
                state = oldState;
                build += c;
                break;

            case 'STRING':
                if (c === '\\') {
                    oldState = state;
                    state = 'ESCAPED';
                    break;
                }

                if (c === '(') {
                    state = 'IN-OPTIONAL';
                    if (build !== '') {
                        tokens.push(build);
                    }
                    build = '';
                    break;
                }

                if (c === '[') {
                    state = 'IN-FORMAT';
                    if (build !== '') {
                        tokens.push(build);
                    }
                    build = '';
                    break;
                }

                build += c;
                break;

            case 'IN-OPTIONAL':
                if (c === ')') {
                    if (build.length === 0) {
                        throw new SyntaxError(
                            `Invalid Syntax on position ${i}! Closed optional defintion without setting a type!`);
                    }

                    if (!TimeTypes.hasOwnProperty(build[0])) {
                        throw new SyntaxError(`Unknown Type '${build[0]}' on position ${i}!`);
                    }

                    if (build.length > 1) {
                        length = verifyType(build.toLowerCase(), i);
                    } else {
                        length = 1;
                    }

                    type = build[0];
                    build = '';
                    state = 'REQUIRE-FORMAT';
                    optional = true;
                    break;
                }

                build += c;
                break;

            case 'IN-FORMAT':
                if (c === '\\') {
                    oldState = state;
                    state = 'ESCAPED';
                    break;
                }

                if (c === '[') {
                    state = 'IN-NESTED';
                    break;
                }

                if (c === ']') {
                    if (!optional) {
                        if (build.length === 0) {
                            throw new SyntaxError(`Invalid Syntax on position ${i}! An format-block may not be empty!`);
                        }

                        if (!TimeTypes.hasOwnProperty(build[0])) {
                            throw new SyntaxError(`Unknown Type '${build[0]}' on position ${i}!`);
                        }

                        if (build.length > 1) {
                            length = verifyType(build.toLowerCase(), i);
                        } else {
                            length = 1;
                        }

                        type = build[0];
                    }

                    const token: Token = {
                        type,
                        length,
                        optional,
                    };

                    if (optional) {
                        token.format = tokenize(build.replace(hashRegex, `$1[${type}${length}]`));
                    }

                    tokens.push(token);
                    build = '';
                    state = 'STRING';
                    optional = false;
                    break;
                }

                build += c;
                break;

            case 'IN-NESTED':
                if (c === '[') {
                    throw new SyntaxError(`Invalid Syntax on position ${i}! You cannot nest an already nested format!`);
                }
                if (c === ']') {
                    if (nestedBuild.length === 0) {
                        throw new SyntaxError(`Invalid Syntax on position ${i}! An format-block may not be empty!`);
                    }

                    if (!TimeTypes.hasOwnProperty(nestedBuild[0])) {
                        throw new SyntaxError(`Unknown Type '${nestedBuild[0]}' on position ${i}!`);
                    }

                    verifyType(nestedBuild.toLowerCase(), i);

                    build += `[${nestedBuild}]`;
                    nestedBuild = '';
                    state = 'IN-FORMAT';
                    break;
                }

                nestedBuild += c;
                break;
        }
    }

    if (state !== 'STRING') {
        throw new SyntaxError('Invalid Syntax! Unexpected end of format!');
    }

    if (build !== '') {
        tokens.push(build);
    }

    return tokens;
}

function verifyType(input: string, position: number): number {
    const type = input[0];
    let isNumber = false;
    let build = '';
    let length = 1;

    for (let i = 1; i < input.length; i++) {
        const c = input[i];

        if (i === 1) {
            isNumber = numberRegex.test(c);
        }

        if (isNumber) {
            if (!numberRegex.test(c)) {
                throw new SyntaxError(`Invalid Type-Definition on position ${position + i}!` +
                    `You may not mix the length with characters!`);
            }
            build += c;
        } else if (c !== type) {
            throw new SyntaxError(`Invalid Type-Defintion on position ${position + i}!` +
                `You may not mix the types!`);
        }

        length++;
    }

    if (isNumber) {
        length = parseInt(build, 10);
    }

    const max = TimeTypes[type];
    if (max > 0 && length > max) {
        throw new SyntaxError(`Invalid Type-Definition on position ${position}!` +
            `The given length is bigger than allowed! Length: ${length}, Max: ${max}`);
    }

    return length;
}
