import { Tokenizer } from './tokenizer';
import { toTime, optimizeTokens } from './utils';
import { FormattingOptions, Time, TimeTypes, Token, TokenType, OptionalToken } from './common';

const tokenizer = new Tokenizer();

/**
 * Class which represents an Aevum formatter.
 * On initialization it's parsing the provided format which can then be
 * used to format a time.
 */
export class Aevum {
    /**
     * Parsed tokens
     */
    private tokens: Array<string | Token>;
    /**
     * Shook tokens mapped by the time-keys.
     */
    private compiled: { [key: string]: Array<string | Token> };

    private readonly defaultOptions: FormattingOptions = {
        strictFormat: false,
        padding: false
    };

    /**
     * Creates an Aevum-Object with the given format-string.
     * Upon initializing a new Aevum-Object, it'll parse the format-string
     * as well as shake the parsed content and saves it.
     *
     * @param formatString Format String string according to the Documentation.
     * @see https://github.com/prefixaut/aevum
     */
    constructor(formatString: string) {
        this.tokens = tokenizer.tokenize(formatString);
        this.compiled = optimizeTokens(this.tokens);
    }

    /**
     * Formats the content into the format with which this Aevum-Object was
     * initialized.
     *
     * @param content Any Number (not NaN/Infinite) or a Time Object.
     * @param options Options which should be applied when formatting the content
     */
    public format(
        content: number | Time,
        options: FormattingOptions = this.defaultOptions
    ): string {
        if (options != null) {
            options = { ...this.defaultOptions, ...options };
        }

        const time = toTime(content);
        // The shook array that is being used.
        let arr: (string | Token)[] = [];
        // Keys for both the time and compiled object
        const keys = ['hours', 'minutes', 'seconds', 'milliseconds'];
        // If the array was set properly
        let flag = false;

        // Iterating over all keys, from biggest to smallest
        for (let i = 0; i < keys.length; i++) {
            // If the time is bigger than 0, take that array
            if (time[keys[i]] > 0) {
                arr = this.compiled[keys[i]];
                flag = true;
                break;
            }
        }

        // If it couldn't find a time-array, just use the 'all'
        if (!flag) {
            arr = this.compiled.all;
        }

        // The content we build together
        let build = '';

        // Rendering all parts of the array and putting it into the build-string.
        for (let i = 0; i < arr.length; i++) {
            build += this.renderPart(arr[i], time, options);
        }

        return build;
    }

    private renderPart(
        part: string | Token,
        time: Time,
        options: FormattingOptions
    ): string {
        if (typeof part === 'string') {
            return part;
        }

        // Handle special type '?'
        if (part.type === TokenType.RELATIVE) {
            return time.positive ? TokenType.POSITIVE : TokenType.NEGATIVE;
        }

        // Handle special type '+' and '-'
        if (
            part.type === TokenType.NEGATIVE ||
            part.type === TokenType.POSITIVE
        ) {
            return this.renderTokenFormat(part as OptionalToken, time, options);
        }

        // Handle all the other types
        return this.renderTimeToken(part, time, options);
    }

    private renderTimeToken(
        token: Token,
        time: Time,
        options: FormattingOptions
    ) {
        let typeLength = 0;
        let build = '';
        let aboveTypeLength = 0;

        if (token.type === TokenType.HOUR) {
            typeLength = time.hours || 0;
        } else if (token.type === TokenType.MINUTE) {
            typeLength = time.minutes || 0;
            aboveTypeLength = time.hours || 0;
        } else if (token.type === TokenType.SECOND) {
            typeLength = time.seconds || 0;
            aboveTypeLength = time.hours || time.minutes || 0;
        } else if (token.type === TokenType.MILLISECOND) {
            typeLength = time.milliseconds || 0;
            aboveTypeLength = time.hours || time.minutes || time.seconds || 0;
        }

        if (token.optional) {
            if (
                !(
                    !options.strictFormat &&
                    typeLength === 0 &&
                    aboveTypeLength > 0
                )
            ) {
                return '';
            } else {
                return this.renderTokenFormat(token, time, options);
            }
        }

        // Store the token-length in new variable, since overriding
        // it would also change it in the compiled token list and
        // screw up length-calculations in the future.
        let tokenLength = token.length;
        if (options.padding && aboveTypeLength > 0) {
            tokenLength = TimeTypes[token.type];
        }

        const str = '' + typeLength;
        const paddingLength = tokenLength - str.length;

        if (paddingLength > 0 && (options.padding || !token.optional)) {
            build = '0'.repeat(paddingLength) + str;
        } else if (options.strictFormat && str.length > tokenLength) {
            build = str.substring(0, tokenLength);
        } else {
            build = str;
        }

        return build;
    }

    private renderTokenFormat(
        token: OptionalToken,
        time: Time,
        options: FormattingOptions
    ) {
        let build = '';

        if (
            (token.type === TokenType.NEGATIVE && !time.positive) ||
            (token.type === TokenType.POSITIVE && time.positive)
        ) {
            for (let i = 0; i < token.format.length; i++) {
                build += this.renderPart(token.format[i], time, options);
            }
        }

        return build;
    }
}
