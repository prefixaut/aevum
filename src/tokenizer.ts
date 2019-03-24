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
    /**
     * When the previous character was a backslash
     * to escape the next one, when in a string
     */
    ESCAPE_STRING,
    /**
     * When the previous character was a backslash
     * to escape the next one, inside of an optional format block
     */
    ESCAPE_OPTIONAL_FORMAT,
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
 * Tokenizer Class which creates tokens from a format-string.
 */
export class Tokenizer {
    /** The compiled array of items */
    private tokens: (string | Token)[];

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
     * The index from where the tokenizing should start from.
     * Utilized by self-invoked calls for nested formats.
     */
    private startIndex: number;
    /** The currently processed character. */
    private character: string;
    /** The index of the currently processed character. */
    private currentIndex: number;

    /**
     * Function to split the format string into an array of strings or Tokens.
     * A single string represents just normal content which should be rendered.
     * A Token contains the data to render it properly.
     *
     * @param format A format-string
     * @param startIndex The index from where it initially started to tokenize. Used only for error output.
     * @throws `SyntaxError` when the format-string could not be parsed or is invalid
     */
    public tokenize(
        format: string,
        startIndex: number = 0
    ): (string | Token)[] {
        this.reset();
        this.startIndex = startIndex;

        /** Length of the format-string */
        const formatLength = format.length;

        // Iterate over each single character of the format string and determine
        // how to handle it according to the current state.
        for (
            this.currentIndex = 0;
            this.currentIndex < formatLength;
            this.currentIndex++
        ) {
            this.character = format.charAt(this.currentIndex);

            switch (this.currentState) {
                case TokenizerState.ESCAPE_STRING:
                    this.handleStateEscapeString();
                    break;

                case TokenizerState.ESCAPE_OPTIONAL_FORMAT:
                    this.handleStateEscapeOptionalFormat();
                    break;

                case TokenizerState.STRING:
                    this.handleStateString();
                    break;

                case TokenizerState.IN_FORMAT:
                    this.handleTypeInFormat();
                    break;

                case TokenizerState.IN_OPTIONAL_TYPE:
                    this.handleStateInOptionalType();
                    break;

                case TokenizerState.IN_OPTIONAL_FORMAT:
                    this.handleStateInOptionalFormat();
                    break;
            }
        }

        if (this.currentState !== TokenizerState.STRING) {
            throw this.prepareError(Errors.UNEXPECTED_EOF, {
                pos: formatLength
            });
        }

        // Reached end of format-string, and content is there
        // push it onto the token stack.
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
        this.currentState = TokenizerState.STRING;
        this.build = '';
        this.tokenType = '' as TokenType;
        this.tokenLength = 0;
        this.isTokenOptional = false;
    }

    /**
     * Simply appends the character to the build,
     * and reverts to the string state.
     */
    private handleStateEscapeString() {
        this.currentState = TokenizerState.STRING;
        this.build += this.character;
    }

    /**
     * Simply appends the escape + character to the build,
     * and reverts to the in-optional-format state.
     */
    private handleStateEscapeOptionalFormat() {
        this.currentState = TokenizerState.IN_OPTIONAL_FORMAT;
        // Add the escape as well, since the build is getting tokenized
        // a second time and woudn't get escaped the second time then.
        this.build += ESCAPE + this.character;
    }

    /**
     * Simply appends the character to the build or switches
     * to an appropiate other state.
     */
    private handleStateString() {
        if (this.character === ESCAPE) {
            this.currentState = TokenizerState.ESCAPE_STRING;
        } else if (
            this.character === OPTIONAL_START ||
            this.character === FORMAT_START
        ) {
            this.handleStart();
        } else {
            this.build += this.character;
        }
    }

    private handleTypeInFormat() {
        if (this.character === FORMAT_END) {
            const token = this.createTokenFromType(this.build, false);
            this.reset(false);
            this.tokens.push(token);
        } else {
            this.build += this.character;
        }
    }

    private handleStateInOptionalType() {
        if (this.character === OPTIONAL_END) {
            const token = this.createTokenFromType(this.build, true);
            this.reset(false);
            this.tokens.push(token);
        } else if (this.character === OPTIONAL_DEF_END) {
            const token = this.createTokenFromType(
                this.build,
                this.isTokenOptional
            );

            this.build = '';
            this.currentState = TokenizerState.IN_OPTIONAL_FORMAT;
            this.tokenType = token.type;
            this.tokenLength = token.length;
        } else {
            this.build += this.character;
        }
    }

    private handleStateInOptionalFormat() {
        if (this.character === ESCAPE) {
            this.currentState = TokenizerState.ESCAPE_OPTIONAL_FORMAT;
        } else if (this.character === OPTIONAL_END) {
            const newTokenizePos = this.currentIndex - this.build.length;
            this.build = this.handleHashSugar(this.build);

            // Need to create a new tokenizer, since calling tokenize of this instance,
            // would reset all content and screw up everything.
            const innerTokenizer = new Tokenizer();
            this.tokens.push({
                type: this.tokenType,
                length: this.tokenLength,
                optional: true,
                format: innerTokenizer.tokenize(this.build, newTokenizePos)
            });

            this.reset(false);
        } else {
            this.build += this.character;
        }
    }

    /**
     * Helper-Function to begin the start of a(n) (optional) format block.
     */
    private handleStart() {
        // Add the current content to the tokens
        if (this.build !== '') {
            this.tokens.push(this.build);
        }
        // Reset the content to store the oncoming type
        this.build = '';

        // Update the state
        if (this.character === OPTIONAL_START) {
            if (this.startIndex > 0) {
                throw this.prepareError(Errors.NESTED_OPTIONAL);
            }
            this.currentState = TokenizerState.IN_OPTIONAL_TYPE;
            this.isTokenOptional = true;
        } else {
            this.currentState = TokenizerState.IN_FORMAT;
            this.isTokenOptional = false;
        }
    }

    private handleHashSugar(content: string): string {
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
                type: this.tokenType
            });
        }

        const tokenValue = `[${this.tokenType.repeat(this.tokenLength)}]`;
        return this.build.replace(HASH_REGEX, match => {
            if (match.length > 1) {
                const cut = match.slice(0, match.length - 1);
                return cut + tokenValue;
            } else {
                return tokenValue;
            }
        });
    }

    private prepareError(
        errorTemplate: string,
        replace?: { [other: string]: any }
    ): string {
        let str = errorTemplate;
        const variables = {
            pos: this.startIndex + this.currentIndex,
            ...replace
        };
        Object.keys(variables).forEach(key => {
            str = str.replace('{' + key + '}', variables[key]);
        });
        throw new SyntaxError(str);
    }

    private createTokenFromType(input: string, optional: boolean): Token {
        input = input.trim();
        if (input.length === 0) {
            throw this.prepareError(Errors.EMPTY_TYPE);
        }

        const indexOffset = this.startIndex + this.currentIndex - input.length;
        const token: Token = { type: input.trim()[0] as TokenType, length: 0, optional };
        let max: number;

        switch (token.type) {
            case TokenType.NEGATIVE:
            case TokenType.POSITIVE:
                if (!optional) {
                    throw this.prepareError(Errors.INVALID_TYPE_IN_FORMAT, {
                        pos: indexOffset,
                        type: token.type
                    });
                }
                token.format = [token.type];
                max = 1;
                break;

            case TokenType.RELATIVE:
                if (optional) {
                    throw this.prepareError(Errors.INVALID_TYPE_IN_OPTIONAL, {
                        pos: indexOffset,
                        type: token.type
                    });
                }
                max = 1;
                break;

            case TokenType.HOUR:
            case TokenType.MINUTE:
            case TokenType.SECOND:
            case TokenType.MILLISECOND:
                max = TimeTypes[token.type];
                break;

            default:
                throw this.prepareError(Errors.UNKNOWN_TYPE, {
                    pos: indexOffset,
                    type: token.type
                });
        }

        let errContent = '';
        let errPos = -1;

        // Calculate the provided length
        for (let i = 1; i < input.length; i++) {
            const c = input[i];

            if (c !== token.type) {
                errContent = input.substring(i);
                errPos = i;
                break;
            }
        }
        token.length = input.length;

        if (errPos > -1) {
            throw this.prepareError(Errors.MIXED_TYPE, {
                pos: indexOffset + errPos,
                content: errContent
            });
        }

        if (max > 0 && input.length > max) {
            throw this.prepareError(Errors.TYPE_LENGTH, {
                pos: indexOffset,
                length: input.length,
                max
            });
        }

        return token;
    }
}
