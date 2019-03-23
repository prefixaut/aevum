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
    /** When in normal text */
    STRING,
    /** When the previous character was a backslash to escape the comming one */
    ESCAPE,
    /** If it's inside a format */
    IN_FORMAT,
    /** If it's inside an optional type-definition */
    IN_OPTIONAL_TYPE,
    /** If it's inside an optional format block */
    IN_OPTIONAL_FORMAT
}

enum Errors {
    // Syntax errors
    EMPTY_FORMAT = 'Invalid Syntax on position ${pos}! An format-block may not be empty!',
    NESTED_OPTIONAL = 'Invalid Syntax on position {pos}! You cannot nest optional blocks!',

    // Type erros
    EMPTY_TYPE = 'Invalid Type-Defintion on position {pos}! The format/optional block does not have a type!',
    MIXED_TYPE = 'Invalid Type-Defintion on position {pos}! You may not mix types!',
    UNKNOWN_TYPE = 'Invalid Type-Defintion on position {pos}! The type "{type}" does not exist!',
    TYPE_LENGTH = 'Invalid Type-Definition on position {pos}! The given length is bigger than allowed! Set length: {length}, maximal length: {max}',

    // Validation errors
    INVALID_TYPE_IN_FORMAT = 'The Type "{type}" on position {pos} can not be used inside a normal format block!',
    INVALID_TYPE_IN_OPTIONAL = 'The Type "{type}" on position {pos} can not be used inside an optional format block!',
    HASH_COMBINE = 'The #-shortcut can not be combined with the Type "{type}" on position {pos}!',
    UNEXPECTED_CONTENT_IN_TYPE = 'Unexpected "{content}" on position {pos}! Expected a continuation of type-definition',
    UNEXPECTED_EOF = 'Unexpected end of format!'
}

const ESCAPE = '\\';
const FORMAT_START = '[';
const FORMAT_END = ']';
const OPTIONAL_START = '(';
const OPTIONAL_END = ')';
const OPTIONAL_DEF_END = ':';

/** Regex used to replace hashes with the format */
const HASH_REGEX = /(?:(?:[^\\])([#])|^(#))/;

/**
 * Function to split the format string into an array of strings or Tokens.
 * A single string represents just normal content which should be rendered.
 * A Token contains the data to render it properly.
 *
 * @param format A format-string
 * @param startIndex The index from where the tokenizing should start from. Utilized by self-invoked calls for nested formats.
 * @throws `SyntaxError` when the format-string could not be parsed or is invalid
 */
export function tokenize(format: string, startIndex = 0): (string | Token)[] {
    /** Length of the format-string */
    const formatLength = format.length;
    /** The compiled array of items */
    const tokens: (string | Token)[] = [];

    /** Previous and current state to be able to determine what to do with the data */
    let previousState: TokenizerState = TokenizerState.STRING;
    let currentState: TokenizerState = TokenizerState.STRING;

    /** The current string build */
    let build = '';

    /** Type of the current format that is being processed */
    let tokenType: null | TokenType = '' as TokenType;
    /** Length of the Type */
    let tokenLength: number = 0;
    /** If the currently processed token is optional or not */
    let isTokenOptional: boolean = false;

    // Iterate over each single character of the format string and determine
    // how to handle it according to the current state.
    for (let currentIndex = 0; currentIndex < formatLength; currentIndex++) {
        const c = format.charAt(currentIndex);

        switch (currentState) {
            case TokenizerState.ESCAPE:
                // Add the escape as well when in an optional format, since the build is getting
                // tokenized a second time.
                if (
                    (previousState as any) === TokenizerState.IN_OPTIONAL_FORMAT
                ) {
                    build += ESCAPE;
                }
                currentState = previousState;
                build += c;
                break;

            case TokenizerState.STRING:
                if (c === ESCAPE) {
                    previousState = currentState;
                    currentState = TokenizerState.ESCAPE;
                    break;
                }

                if (c === OPTIONAL_START || c === FORMAT_START) {
                    // Add the current content to the tokens
                    if (build !== '') {
                        tokens.push(build);
                    }
                    // Reset the content to store the oncoming type
                    build = '';

                    // Update the state
                    if (c === OPTIONAL_START) {
                        if (startIndex > 0) {
                            throw new SyntaxError(
                                formatError(Errors.NESTED_OPTIONAL, {
                                    pos: startIndex + currentIndex
                                })
                            );
                        }
                        currentState = TokenizerState.IN_OPTIONAL_TYPE;
                        isTokenOptional = true;
                    } else {
                        currentState = TokenizerState.IN_FORMAT;
                        isTokenOptional = false;
                    }
                    break;
                }

                build += c;
                break;

            case TokenizerState.IN_FORMAT:
            case TokenizerState.IN_OPTIONAL_TYPE:
                if (
                    currentState === TokenizerState.IN_FORMAT
                        ? c === FORMAT_END
                        : c === OPTIONAL_END || c === OPTIONAL_DEF_END
                ) {
                    const typeData = verifyType(
                        build,
                        startIndex + currentIndex,
                        isTokenOptional
                    );
                    build = '';

                    if (c === OPTIONAL_END || c === FORMAT_END) {
                        const token: Token = {
                            ...typeData,
                            optional: isTokenOptional
                        };

                        switch (token.type) {
                            case TokenType.POSITIVE:
                            case TokenType.NEGATIVE:
                                if (!isTokenOptional) {
                                    throw new SyntaxError(
                                        formatError(
                                            Errors.INVALID_TYPE_IN_FORMAT,
                                            {
                                                pos: startIndex + currentIndex,
                                                type: token.type
                                            }
                                        )
                                    );
                                }
                                token.format = [token.type];
                                break;
                            case TokenType.RELATIVE:
                                if (isTokenOptional) {
                                    throw new SyntaxError(
                                        formatError(
                                            Errors.INVALID_TYPE_IN_OPTIONAL,
                                            {
                                                pos: startIndex + currentIndex,
                                                type: token.type
                                            }
                                        )
                                    );
                                }
                                break;
                            default:
                                if (isTokenOptional) {
                                    token.format = [
                                        { ...token, optional: false }
                                    ];
                                }
                                break;
                        }

                        currentState = TokenizerState.STRING;
                        tokens.push(token);
                        break;
                    }

                    currentState = TokenizerState.IN_OPTIONAL_FORMAT;
                    tokenType = typeData.type;
                    tokenLength = typeData.length;
                    break;
                }

                build += c;
                break;

            case TokenizerState.IN_OPTIONAL_FORMAT:
                if (c === ESCAPE) {
                    previousState = currentState;
                    currentState = TokenizerState.ESCAPE;
                    break;
                }

                if (c === OPTIONAL_END) {
                    const newTokenizePos = currentIndex - build.length;
                    if (HASH_REGEX.test(build)) {
                        if (
                            tokenType == null ||
                            tokenType === TokenType.POSITIVE ||
                            tokenType === TokenType.NEGATIVE ||
                            tokenType === TokenType.RELATIVE
                        ) {
                            throw new SyntaxError(
                                formatError(Errors.HASH_COMBINE, {
                                    pos: startIndex + currentIndex,
                                    tokenType
                                })
                            );
                        }

                        build = build.replace(
                            HASH_REGEX,
                            (match) => {
                                const content = `[${(tokenType as TokenType).repeat(tokenLength)}]`;
                                if (match.length > 1) {
                                    const cut = match.slice(0, match.length - 1);
                                    return `${cut}${content}`;
                                } else {
                                    return content;
                                }
                            }
                        );
                    }

                    tokens.push({
                        type: tokenType,
                        length: tokenLength,
                        optional: true,
                        format: tokenize(build, newTokenizePos)
                    });

                    build = '';
                    currentState = TokenizerState.STRING;
                    break;
                }

                build += c;
                break;
        }
    }

    if (currentState !== TokenizerState.STRING) {
        throw new SyntaxError(
            formatError(Errors.UNEXPECTED_EOF, { pos: formatLength })
        );
    }

    if (build !== '') {
        tokens.push(build);
    }

    return tokens;
}

function formatError(
    errorTemplate: string,
    replace: { pos: number; [other: string]: any }
): string {
    let str = errorTemplate;
    Object.keys(replace).forEach(key => {
        str = str.replace('{' + key + '}', replace[key]);
    });
    return str;
}

function verifyType(
    input: string,
    position: number,
    optional: boolean
): { type: TokenType; length: number } {
    input = input.trim();
    if (input.length === 0) {
        throw new SyntaxError(
            formatError(Errors.EMPTY_TYPE, { pos: position })
        );
    }

    const type = input.trim()[0];
    let length = 1;

    switch (type) {
        case TokenType.NEGATIVE:
        case TokenType.POSITIVE:
        case TokenType.RELATIVE:
        case TokenType.HOUR:
        case TokenType.MINUTE:
        case TokenType.SECOND:
        case TokenType.MILLISECOND:
            break;
        default:
            throw new SyntaxError(
                formatError(Errors.UNKNOWN_TYPE, {
                    pos: position - input.length,
                    type
                })
            );
    }

    let errContent = '';
    let errPos = -1;

    // Calculate the provided length
    for (let i = 1; i < input.length; i++) {
        const c = input[i];

        if (c !== type) {
            errContent += c;
            if (errPos === -1) {
                errPos = i;
            }
            continue;
        }

        length++;
    }

    if (errPos > -1) {
        throw new SyntaxError(
            formatError(Errors.MIXED_TYPE, {
                pos: position - input.length + errPos,
                content: errContent
            })
        );
    }

    let max: number;
    switch (type) {
        case TokenType.NEGATIVE:
        case TokenType.POSITIVE:
        case TokenType.RELATIVE:
            max = 1;
            break;
        default:
            max = TimeTypes[type];
    }
    if (max > 0 && length > max) {
        throw new SyntaxError(
            formatError(Errors.TYPE_LENGTH, {
                pos: position - input.length,
                length,
                max
            })
        );
    }

    return { type, length };
}
