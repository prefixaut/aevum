import {
    Errors,
    ESCAPE,
    FORMAT_END,
    FORMAT_START,
    HASH_REGEX,
    OPTIONAL_DEF_END,
    OPTIONAL_END,
    OPTIONAL_START,
    TimeTypes,
    Token,
    TokenizerState,
    TokenType,
} from './common';
import { prepareError } from './utils';

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

    /**
     * Handler function to append the current character to the build
     * until it reaches the end and call {@link handleFormatDefinition}.
     */
    private handleTypeInFormat() {
        if (this.character === FORMAT_END) {
            this.handleFormatDefintion(false);
        } else {
            this.build += this.character;
        }
    }

    private handleStateInOptionalType() {
        if (this.character === OPTIONAL_END) {
            this.handleFormatDefintion(true);
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

    private handleFormatDefintion(optional: boolean) {
        const token = this.createTokenFromType(this.build, optional);
        this.reset(false);
        this.tokens.push(token);
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
        throw new SyntaxError(
            prepareError(errorTemplate, {
                pos: this.startIndex + this.currentIndex,
                ...replace
            })
        );
    }

    private createTokenFromType(input: string, optional: boolean): Token {
        input = input.trim();
        if (input.length === 0) {
            throw this.prepareError(Errors.EMPTY_TYPE);
        }

        const indexOffset = this.startIndex + this.currentIndex - input.length;
        let token: Token;
        if (optional) {
            token = {
                type: input.trim()[0] as TokenType,
                length: input.length,
                optional: true,
                format: []
            };
        } else {
            token = {
                type: input.trim()[0] as TokenType,
                length: input.length,
                optional: false
            };
        }

        this.validateTokenType(input, token, indexOffset);
        return this.validateMaxTokenLength(token, indexOffset);
    }

    private validateTokenType(input: string, token: Token, indexOffset: number) {
        let errContent = '';
        let errPos = -1;

        // Calculate the provided length
        for (let i = 1; i < token.length; i++) {
            const c = input[i];

            if (c !== token.type) {
                errContent += input[i];
                if (errPos < 0) {
                    errPos = i;
                }
                break;
            }
        }

        if (errPos > -1) {
            throw this.prepareError(Errors.MIXED_TYPE, {
                pos: indexOffset + errPos,
                content: errContent
            });
        }
    }

    /**
     * Validates the token with the maximal length and applies
     * the formats for optional tokens.
     *
     * @param token The token to validate
     * @param indexOffset The offset for errors
     */
    private validateMaxTokenLength(token: Token, indexOffset: number) {
        let max: number;

        switch (token.type) {
            case TokenType.NEGATIVE:
            case TokenType.POSITIVE:
                if (!token.optional) {
                    throw this.prepareError(Errors.INVALID_TYPE_IN_FORMAT, {
                        pos: indexOffset,
                        type: token.type
                    });
                }
                token.format = [token.type];
                max = 1;
                break;

            case TokenType.RELATIVE:
                if (token.optional) {
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
                if (token.optional) {
                    token.format = [
                        {
                            type: token.type,
                            length: token.length,
                            optional: false
                        }
                    ];
                }
                max = TimeTypes[token.type];
                break;

            default:
                throw this.prepareError(Errors.UNKNOWN_TYPE, {
                    pos: indexOffset,
                    type: token.type
                });
        }

        if (max > 0 && token.length > max) {
            throw this.prepareError(Errors.TYPE_LENGTH, {
                pos: indexOffset,
                length: token.length,
                max
            });
        }

        return token;
    }
}
