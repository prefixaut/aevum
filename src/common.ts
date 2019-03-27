/**
 * An interface which represents the Schema of how the time is
 * parsed or consumed by aevum in order to format it correctly.
 */
export interface Time {
    positive?: boolean;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
}

export interface FormattingOptions {
    /** If elements should be allowed to be longer than the provided length */
    strictFormat?: boolean;
    /** If the time has a bigger unit, it'll automatically apply padding to the units below it */
    padding?: boolean;
}

/**
 * Constant to define Types for the tokenizer.
 * Each type is only one letter long and has the
 * maximum length as value.
 */
export const TimeTypes: { [key: string]: number } = {
    h: -1,
    m: 2,
    s: 2,
    d: 3
};

export enum TokenType {
    MILLISECOND = 'd',
    SECOND = 's',
    MINUTE = 'm',
    HOUR = 'h',
    POSITIVE = '+',
    NEGATIVE = '-',
    RELATIVE = '?'
}

export interface OptionalToken {
    type: TokenType;
    length: number;
    optional: true;
    format: (string | Token)[];
}

export interface RegularToken {
    type: TokenType;
    length: number;
    optional: false;
}

export type Token = (OptionalToken | RegularToken);

export enum TokenizerState {
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

export enum Errors {
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

export const ESCAPE = '\\';
export const FORMAT_START = '[';
export const FORMAT_END = ']';
export const OPTIONAL_START = '(';
export const OPTIONAL_END = ')';
export const OPTIONAL_DEF_END = ':';

/** Regex used to replace hashes with the format */
export const HASH_REGEX = /(?:(?:[^\\])([#])|^(#))/;
