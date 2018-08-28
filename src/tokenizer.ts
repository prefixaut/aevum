import { TimeTypes } from './aevum';

export enum TokenType {
    MILLISECOND = 'd',
    SECOND = 's',
    MINUTE = 'm',
    HOUR = 'h',
    POSITIVE = '+',
    NEGATIVE = '-',
    RELATIVE = '?'
}

export interface Token {
    type: TokenType;
    length: number;
    optional: boolean;
    format?: (string | Token)[];
}

enum TokenizerState {
    STRING,
    ESCAPED,
    IN_OPTIONAL,
    REQUIRE_FORMAT,
    IN_FORMAT,
    IN_NESTED
}

enum Errors {
    // Syntax errors
    CLOSED_OPTIONAL = 'Invalid Syntax on position {pos}! Closed optional defintion without setting a type!',
    EMPTY_FORMAT_BLOCK = 'Invalid Syntax on position ${pos}! An format-block may not be empty!',
    DEEP_NESTED = 'Invalid Syntax on position {pos}! You cannot nest multiple levels!',

    // Validation errors
    MIXED_LENGTH = 'Invalid Type-Definition on position {pos}! You may not mix the length with something else!',
    MIXED_TYPE = 'Invalid Type-Defintion on position {pos}! You may not mix types!',
    LENGTH_OVERFLOW = 'Invalid Type-Definition on position {position}! The given length is bigger than allowed! Length: {length}, Max: {max}',
    HASH_COMBINE = 'The #-Type can not be combined with the Type "{type}" on position {pos}!',
    UNEXPECTED_CONTENT = 'Unexpected "{seq}"! Expected an format assignment at position: ${pos}!',
    UNEXPECTED_EOF = 'Unexpected end of format!',
    UNKNOWN_TYPE = 'Unknown Type "{type}" on position {pos}!'
}

const ESCAPE = '\\';
const FORMAT_START = '[';
const FORMAT_END = ']';
const OPTIONAL_START = '(';
const OPTIONAL_END = ')';

/** Regex for numbers */
const NUMBER_REGEX = /^\d+$/;
/** Regex used to replace hashes with the format */
const HASH_REGEX = /([^\\])(#)/;

/**
 * Function to split the format string into an array of strings or Tokens.
 * A single string represents just normal content which should be rendered.
 * A Token contains the data to render it properly.
 *
 * @param format A format-string
 * @param index The index from where the tokenizing should start from. Utilized by self-invoked calls for nested formats.
 * @throws `SyntaxError` when the format-string could not be parsed or is invalid
 */
export function tokenize(format: string, index = 0): (string | Token)[] {

    /** Length of the format-string */
    const formatLength = format.length;
    /** The compiled array of items */
    const tokens: (string | Token)[] = [];

    /** Previous and current state to be able to determine what to do with the data */
    let previousState: TokenizerState = TokenizerState.STRING;
    let currentState: TokenizerState = TokenizerState.STRING;

    /** The nested-format content */
    let nestedBuild = '';
    /** The current string build */
    let build = '';

    /** Type of the current format that is being processed */
    let tokenType: TokenType = '' as TokenType;
    /** Length of the Type */
    let tokenLength: number = 0;
    /** If the currently processed token is optional or not */
    let isTokenOptional: boolean = false;

    for (let i = 0; i < formatLength; i++) {
        const c = format.charAt(i);

        switch (currentState) {
            case TokenizerState.REQUIRE_FORMAT:
                if (c !== FORMAT_START) {
                    throw new SyntaxError(formatError(Errors.UNEXPECTED_CONTENT, { pos: index + i, seq: c }));
                }
                currentState = TokenizerState.IN_FORMAT;
                break;

            case TokenizerState.ESCAPED:
                // Adding the backslash/escape character again, since the content
                // of an State.IN_FORMAT will be tokenized again which causes the
                // content not to be escaped properly, as the escape doesn't
                // happen in the second round of the tokenizing
                if (previousState as any === TokenizerState.IN_FORMAT) {
                    build += ESCAPE;
                }
                currentState = previousState;
                build += c;
                break;

            case TokenizerState.STRING:
                if (c === ESCAPE) {
                    previousState = currentState;
                    currentState = TokenizerState.ESCAPED;
                    break;
                }

                if (c === OPTIONAL_START) {
                    currentState = TokenizerState.IN_OPTIONAL;
                    if (build !== '') {
                        tokens.push(build);
                    }
                    build = '';
                    break;
                }

                if (c === FORMAT_START) {
                    currentState = TokenizerState.IN_FORMAT;
                    if (build !== '') {
                        tokens.push(build);
                    }
                    build = '';
                    break;
                }

                build += c;
                break;

            case TokenizerState.IN_OPTIONAL:
                if (c === OPTIONAL_END) {
                    if (build.length === 0) {
                        throw new SyntaxError(formatError(Errors.CLOSED_OPTIONAL, { pos: index + i }));
                    }

                    if (build === TokenType.POSITIVE || build === TokenType.NEGATIVE) {
                        tokenLength = 1;
                    } else {
                        if (!TimeTypes.hasOwnProperty(build[0])) {
                            throw new SyntaxError(formatError(Errors.UNKNOWN_TYPE, { pos: index + 1, type: build[0] }));
                        }

                        if (build.length > 1) {
                            tokenLength = verifyType(build.toLowerCase(), index + i);
                        } else {
                            tokenLength = 1;
                        }
                    }

                    tokenType = build[0] as TokenType;
                    build = '';
                    currentState = TokenizerState.REQUIRE_FORMAT;
                    isTokenOptional = true;
                    break;
                }

                build += c;
                break;

            case TokenizerState.IN_FORMAT:
                if (c === ESCAPE) {
                    previousState = currentState;
                    currentState = TokenizerState.ESCAPED;
                    break;
                }

                if (c === FORMAT_START) {
                    currentState = TokenizerState.IN_NESTED;
                    break;
                }

                if (c === FORMAT_END) {
                    if (!isTokenOptional) {
                        if (build.length === 0) {
                            throw new SyntaxError(formatError(Errors.EMPTY_FORMAT_BLOCK, { pos: index + i }));
                        }

                        if (build === TokenType.RELATIVE) {
                            tokens.push({
                                type: TokenType.RELATIVE,
                                length: 1,
                                optional: false
                            });
                            build = '';
                            isTokenOptional = false;
                            currentState = TokenizerState.STRING;
                            break;
                        }

                        if (!TimeTypes.hasOwnProperty(build[0])) {
                            throw new SyntaxError(formatError(Errors.UNKNOWN_TYPE, { pos: index + i, type: build[0] }));
                        }

                        if (build.length > 1) {
                            tokenLength = verifyType(build.toLowerCase(), index + i);
                        } else {
                            tokenLength = 1;
                        }

                        tokenType = build[0] as TokenType;
                    }

                    const token: Token = {
                        type: tokenType,
                        length: tokenLength,
                        optional: isTokenOptional
                    };

                    if (isTokenOptional) {
                        if (HASH_REGEX.test(build)) {
                            if (tokenType === TokenType.POSITIVE || tokenType === TokenType.NEGATIVE) {
                                throw new SyntaxError(formatError(Errors.HASH_COMBINE, { pos: index + i, tokenType }));
                            }
                            build = build.replace(HASH_REGEX, `$1[${tokenType}${tokenLength}]`);
                        }
                        token.format = tokenize(build, i - build.length - 4);
                    }

                    tokens.push(token);
                    build = '';
                    currentState = TokenizerState.STRING;
                    isTokenOptional = false;
                    break;
                }

                build += c;
                break;

            case TokenizerState.IN_NESTED:
                if (c === FORMAT_START) {
                    throw new SyntaxError();
                }
                if (c === FORMAT_END) {
                    if (nestedBuild.length === 0) {
                        throw new SyntaxError(formatError(Errors.EMPTY_FORMAT_BLOCK, { pos: index + i }));
                    }

                    if (!TimeTypes.hasOwnProperty(nestedBuild[0])) {
                        throw new SyntaxError(
                            formatError(Errors.UNKNOWN_TYPE, { pos: index + i, type: nestedBuild[0] })
                        );
                    }

                    verifyType(nestedBuild.toLowerCase(), index + i);

                    build += `[${nestedBuild}]`;
                    nestedBuild = '';
                    currentState = TokenizerState.IN_FORMAT;
                    break;
                }

                nestedBuild += c;
                break;
        }
    }

    if (currentState !== TokenizerState.STRING) {
        throw new SyntaxError(formatError(Errors.UNEXPECTED_EOF, { pos: formatLength }));
    }

    if (build !== '') {
        tokens.push(build);
    }

    return tokens;
}

function formatError(errorTemplate: string, replace: { pos: number; [other: string]: any }): string {
    let str = errorTemplate;
    Object.keys(replace).forEach(key => {
        str = str.replace('{' + key + '}', replace[key]);
    });
    return str;
}

function verifyType(input: string, position: number): number {
    const type = input[0];
    let isNumber = false;
    let build = '';
    let length = 1;

    for (let i = 1; i < input.length; i++) {
        const c = input[i];

        if (i === 1) {
            isNumber = NUMBER_REGEX.test(c);
        }

        if (isNumber) {
            if (!NUMBER_REGEX.test(c)) {
                throw new SyntaxError(formatError(Errors.MIXED_LENGTH, { pos: position + i }));
            }
            build += c;
        } else if (c !== type) {
            throw new SyntaxError(formatError(Errors.MIXED_TYPE, { pos: position + i }));
        }

        length++;
    }

    if (isNumber) {
        length = parseInt(build, 10);
    }

    const max = TimeTypes[type];
    if (max > 0 && length > max) {
        throw new SyntaxError(formatError(Errors.LENGTH_OVERFLOW, { pos: position, length, max }));
    }

    return length;
}
