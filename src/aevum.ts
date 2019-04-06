import {
    FormattingOptions,
    OptimizedTime,
    OptionalToken,
    Time,
    TimeTypes,
    Token,
    TokenType
} from './common';
import { Tokenizer } from './tokenizer';
import { optimizeTime, optimizeTokens, toTime } from './utils';

// Private tokenizer instance to ... tokenize. duh
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
        // Default the options
        if (options != null) {
            options = { ...this.defaultOptions, ...options };
        }

        // Converts (if needed) the timestamp to a time-object and validates it
        const time = toTime(content);

        // Optimize the time content, to prevent costly calculations
        // for each single token
        const optimizedTime = optimizeTime(time, options);

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
            build += this.renderPart(arr[i], optimizedTime, options);
        }

        return build;
    }

    private renderPart(
        part: string | Token,
        time: OptimizedTime,
        options: FormattingOptions
    ): string {
        // Simple string-parts do not need to be rendered specially
        if (typeof part === 'string') {
            return part;
        }

        // Handle special type '?'
        if (part.type === TokenType.RELATIVE) {
            return time.positive ? TokenType.POSITIVE : TokenType.NEGATIVE;
        }

        // Handle special type '+' and '-'
        if (part.optional) {
            return this.renderRemainingOptional(
                part as OptionalToken,
                time,
                options
            );
        }

        // Handle all the other types
        return this.renderTimeToken(part, time, options);
    }

    private renderTimeToken(
        token: Token,
        time: OptimizedTime,
        options: FormattingOptions
    ) {
        let build = '';
        const value = time[token.type].value;
        const aboveTypeValue = time[token.type].aboveTypeValue;

        // The only optional tokens which are left, are with the type
        // NEGATIVE, POSITIVE and RELATIVE. All other were cut during
        // the optimization process in the constructor.
        if (token.optional) {
            if (
                !options.strictFormat ||
                value !== 0 ||
                aboveTypeValue < 1
            ) {
                return this.renderRemainingOptional(token, time, options);
            } else {
                return '';
            }
        }

        // Store the token-length in new variable, since overriding
        // it would also change it in the compiled token list and
        // screw up length-calculations in the future.
        let maximalLength = token.length;
        if (options.padding && aboveTypeValue > 0) {
            maximalLength = TimeTypes[token.type];
        }

        const str = '' + value;
        const paddingLength = maximalLength - str.length;

        if (paddingLength > 0 && (options.padding || !token.optional)) {
            build = '0'.repeat(paddingLength) + str;
        } else if (options.strictFormat && str.length > maximalLength) {
            build = str.substring(0, maximalLength);
        } else {
            build = str;
        }

        return build;
    }

    /**
     * Helper functions which renders the remaining optional types,
     * which could not get optimized before the run.
     * Currently the case for NEGATIVE, POSITIVE and RELATIVE tokens.
     *
     * @param token The optional token that should get rendered
     * @param time The time time that should get rendered
     * @param options Formatting-Options
     */
    private renderRemainingOptional(
        token: OptionalToken,
        time: OptimizedTime,
        options: FormattingOptions
    ) {
        let build = '';

        // Only render the tokens which are eligable to be rendered
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
