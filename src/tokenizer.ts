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

export class Tokenizer {
    /** The compiled array of items */
    private tokens: (string | Token)[];

    /** Previous state of the tokenizer */
    private previousState: TokenizerState;
    /** Current state of the tokenizer */
    private currentState: TokenizerState;

    /** The current string build */
    private build: string;

    /** Type of the current format that is being processed */
    private tokenType: TokenType;
    /** Length of the Type */
    private tokenLength: number;
    /** If the currently processed token is optional or not */
    private isTokenOptional: boolean;

    /**
     * Function to split the format string into an array of strings or Tokens.
     * A single string represents just normal content which should be rendered.
     * A Token contains the data to render it properly.
     *
     * @param format A format-string
     * @param startIndex The index from where the tokenizing should start from. Utilized by self-invoked calls for nested formats.
     * @throws `SyntaxError` when the format-string could not be parsed or is invalid
     */
    public tokenize(format: string, startIndex = 0): (string | Token)[] {
        this.reset();

        /** Length of the format-string */
        const formatLength = format.length;

        // Iterate over each single character of the format string and determine
        // how to handle it according to the current state.
        for (
            let currentIndex = 0;
            currentIndex < formatLength;
            currentIndex++
        ) {
            const character = format.charAt(currentIndex);

            switch (this.currentState) {
                case TokenizerState.ESCAPE:
                    this.handleTypeEscape(character);
                    break;

                case TokenizerState.STRING:
                    this.handleTypeString(character, currentIndex, startIndex);
                    break;

                case TokenizerState.IN_FORMAT:
                    this.handleTypeInFormat(
                        character,
                        currentIndex,
                        startIndex
                    );
                    break;

                case TokenizerState.IN_OPTIONAL_TYPE:
                    this.handleTypeOptionalType(
                        character,
                        currentIndex,
                        startIndex
                    );
                    break;

                case TokenizerState.IN_OPTIONAL_FORMAT:
                    this.handleTypeOptionalFormat(
                        character,
                        currentIndex,
                        startIndex
                    );
                    break;
            }
        }

        if (this.currentState !== TokenizerState.STRING) {
            throw this.prepareError(Errors.UNEXPECTED_EOF, {
                pos: formatLength
            });
        }

        if (this.build !== '') {
            this.tokens.push(this.build);
        }

        return this.tokens;
    }

    /**
     * Resets the tokenizer so it can tokenize
     * a new format with a clean state.
     */
    private reset(resetTokens: boolean = true) {
        if (resetTokens) {
            this.tokens = [];
        }
        this.previousState = TokenizerState.STRING;
        this.currentState = TokenizerState.STRING;
        this.build = '';
        this.tokenType = '' as TokenType;
        this.tokenLength = 0;
        this.isTokenOptional = false;
    }

    private handleTypeEscape(character: string) {
        // Add the escape as well when in an optional format, since the build is getting
        // tokenized a second time.
        if (this.previousState === TokenizerState.IN_OPTIONAL_FORMAT) {
            this.build += ESCAPE;
        }
        this.currentState = this.previousState;
        this.build += character;
    }

    private handleTypeString(
        character: string,
        currentIndex: number,
        startIndex: number = 0
    ) {
        if (character === ESCAPE) {
            this.previousState = this.currentState;
            this.currentState = TokenizerState.ESCAPE;
        }

        if (character === OPTIONAL_START || character === FORMAT_START) {
            this.handleStart(character, currentIndex, startIndex);
        } else {
            this.build += character;
        }
    }

    private handleTypeInFormat(
        character: string,
        currentIndex: number,
        startIndex: number = 0
    ) {
        if (character === OPTIONAL_END) {
            this.handleDefinition(currentIndex, startIndex);
        } else if (character === OPTIONAL_DEF_END) {
            const token = this.createTokenFromType(
                this.build,
                startIndex + currentIndex,
                this.isTokenOptional
            );

            this.build = '';
            this.currentState = TokenizerState.IN_OPTIONAL_FORMAT;
            this.tokenType = token.type;
            this.tokenLength = token.length;
        } else {
            this.build += character;
        }
    }

    private handleTypeOptionalType(
        character: string,
        currentIndex: number,
        startIndex: number = 0
    ) {
        if (character === FORMAT_END) {
            this.handleDefinition(currentIndex, startIndex);
        } else {
            this.build += character;
        }
    }

    private handleTypeOptionalFormat(
        character: string,
        currentIndex: number,
        startIndex: number = 0
    ) {
        if (character === ESCAPE) {
            this.previousState = this.currentState;
            this.currentState = TokenizerState.ESCAPE;
        } else if (character === OPTIONAL_END) {
            const newTokenizePos = currentIndex - this.build.length;
            this.build = this.handleHashSugar(
                this.build,
                currentIndex,
                startIndex
            );

            this.tokens.push({
                type: this.tokenType,
                length: this.tokenLength,
                optional: true,
                format: this.tokenize(this.build, newTokenizePos)
            });

            this.reset(false);
        } else {
            this.build += character;
        }
    }

    private handleStart(
        character: string,
        currentIndex: number,
        startIndex: number = 0
    ) {
        // Add the current content to the tokens
        if (this.build !== '') {
            this.tokens.push(this.build);
        }
        // Reset the content to store the oncoming type
        this.build = '';

        // Update the state
        if (character === OPTIONAL_START) {
            if (startIndex > 0) {
                throw this.prepareError(Errors.NESTED_OPTIONAL, {
                    pos: startIndex + currentIndex
                });
            }
            this.currentState = TokenizerState.IN_OPTIONAL_TYPE;
            this.isTokenOptional = true;
        } else {
            this.currentState = TokenizerState.IN_FORMAT;
            this.isTokenOptional = false;
        }
    }

    private handleHashSugar(
        content: string,
        currentIndex: number,
        startIndex: number = 0
    ): string {
        if (!HASH_REGEX.test(content)) {
            return content;
        }

        if (
            this.tokenType == null ||
            this.tokenType === TokenType.POSITIVE ||
            this.tokenType === TokenType.NEGATIVE ||
            this.tokenType === TokenType.RELATIVE
        ) {
            throw this.prepareError(Errors.HASH_COMBINE, {
                pos: startIndex + currentIndex,
                type: this.tokenType
            });
        }

        return this.build.replace(HASH_REGEX, match => {
            const tokenValue = `[${this.tokenType.repeat(this.tokenLength)}]`;
            if (match.length > 1) {
                const cut = match.slice(0, match.length - 1);
                return `${cut}${tokenValue}`;
            } else {
                return tokenValue;
            }
        });
    }

    private handleDefinition(currentIndex: number, startIndex: number = 0) {
        const token = this.createTokenFromType(
            this.build,
            startIndex + currentIndex,
            this.isTokenOptional
        );

        if (this.isTokenOptional) {
            token.format = [{ ...token, optional: false }];
        }

        this.tokens.push(token);
        this.reset(false);
    }

    private prepareError(
        errorTemplate: string,
        replace: { pos: number; [other: string]: any }
    ): string {
        let str = errorTemplate;
        Object.keys(replace).forEach(key => {
            str = str.replace('{' + key + '}', replace[key]);
        });
        throw new SyntaxError(str);
    }

    private createTokenFromType(
        input: string,
        position: number,
        optional: boolean
    ): Token {
        input = input.trim();
        if (input.length === 0) {
            throw this.prepareError(Errors.EMPTY_TYPE, { pos: position });
        }

        const type = input.trim()[0];
        const token: Token = { type: type as TokenType, length: 0, optional };
        let length = 1;
        let max: number;

        switch (type) {
            case TokenType.NEGATIVE:
            case TokenType.POSITIVE:
                if (!optional) {
                    throw this.prepareError(Errors.INVALID_TYPE_IN_FORMAT, {
                        pos: position - input.length,
                        type: token.type
                    });
                }
                token.format = [token.type];
                max = 1;
                break;

            case TokenType.RELATIVE:
                if (optional) {
                    throw this.prepareError(Errors.INVALID_TYPE_IN_OPTIONAL, {
                        pos: position - input.length,
                        type: token.type
                    });
                }
                max = 1;
                break;

            case TokenType.HOUR:
            case TokenType.MINUTE:
            case TokenType.SECOND:
            case TokenType.MILLISECOND:
                max = TimeTypes[type];
                break;

            default:
                throw this.prepareError(Errors.UNKNOWN_TYPE, {
                    pos: position - input.length,
                    type
                });
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
        token.length = length;

        if (errPos > -1) {
            throw this.prepareError(Errors.MIXED_TYPE, {
                pos: position - input.length + errPos,
                content: errContent
            });
        }

        if (max > 0 && length > max) {
            throw this.prepareError(Errors.TYPE_LENGTH, {
                pos: position - input.length,
                length,
                max
            });
        }

        return token;
    }
}
