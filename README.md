[![Travis](https://img.shields.io/travis/prefixaut/aevum.svg?style=flat-square)](https://travis-ci.org/prefixaut/aevum)
[![npm Version](https://img.shields.io/npm/v/aevum.svg?style=flat-square)](https://www.npmjs.com/package/aevum)
[![Code Climate](https://img.shields.io/codeclimate/coverage/github/prefixaut/aevum.svg?style=flat-square)](https://codeclimate.com/github/prefixaut/aevum)
[![npm License](https://img.shields.io/npm/l/aevum.svg?style=flat-square)](https://www.npmjs.com/package/aevum)

# Aevum

is a highly customizable time (not date!) formatter. It's syntax is simple and allows you to do whatever you need to do.

## Installation

The best way to install `aevum` is via npm like so
```bash
npm install --save aevum
```

## Usage

Aevum is getting compiled via [webpack](https://webpack.js.org) to make it compatible with CommonJS(2), AMD and as Global-Variable (If none of the previous is used).
It also translates the ES6-Styled Typescript down to ES3 to make it compatible with browsers.

```javascript
// CommonJS Module
import { Aevum } from 'aevum';
// or in typescript also via 'aevum/src/aevum' for interfaces
new Aevum('...')

// AMD Module
define(['aevum'], function(aevum) {
    new aevum.Aevum('...')
});

// Global Variable
new aevum.Aevum('...')
```

The system is thought to make a format once and then apply some data to it. This prevents overhead of re-compiling the format every time when a new value is being passed in. You can think of it like a `RegExp`.

```javascript
import { Aevum } from 'aevum';

// BAD
let tmp = 0
function update() {
    new Aevum('My own format: (hh)[#:\\[[mm]\\]][ss].[ddd]').format(tmp)
    tmp += 1000
    setTimeout(update, 100)
}

// GOOD
let myFormat = new Aevum('My own format: (hh)[#:\\[[mm]\\]][ss].[ddd]')
let tmp = 0
function update() {
    myFormat.format(tmp)
    tmp += 1000
    setTimeout(update, 100)
}

```

## Syntax

Aevum is using a simple Syntax and only uses five special characters: `[`, `]`, `(` , `)` and `#`.
The format itself consists of three possible things:

- A String
- An format block
- An optional format block

### Types

Types in aevum are used to identify which content you want to display.
The Type is case ___insensitive___ and has to be one of the following:

- `h` for hours
- `m` for minutes
- `s` for seconds
- `d` for milliseconds

Since `v1.2.0` there are now special timing-types:

- `-` for negative times
- `+` for positive times
- `?` which outputs the strings `+` or `-` depending if the time is positive

These are special Types and can not be used everywhere. The `+` and `-` Types can only be used in [optional format blocks](#optional-format-block) and may __not__ use the `#` as [Syntactic Sugar](#syntactic-sugar). The `?` Type on the other hand, can __only be used as [normal format block](#format-block)__.

### Format Block

An format block is simply put a placeholder. It will be replaced with the content of the type (hours, minutes, seconds or milliseconds) and allows you to specify padding. The format block is specified by surrounding the type with square-brackets (`[` and `]`) like this:

```none
[d]
```

### Padding

For format blocks you can specify some padding by either repeating the type-character as often as required or simply set a number after it.

`[ddd]` is the same as `[d3]` or `[hhhhhhhhhhhhhhhhhhh]` is also the same as `[h19]`.
Beware that there are some limitations on the padding length. This is because smaller units (milliseconds, seconds and minutes) will be upscaled. It would therefore be an error if the padding is bigger than the type can possbibly take up.

This means simply put: __minutes__ and __seconds__ can not have a bigger padding than 2, and __milliseconds__ not a bigger one than 3. However if you do, you'll get a `SyntaxError`!

### Optional format block

An optional format block is a little different from an normal format block. It will only be rendered when the type you specified is bigger than zero. This allows you to hide unwanted content when it's simply not needed.

The optional format block starts by specifiying a type inbetween normal brackets ( `(` and `)` ). Right after that you have to specify the content wrapped inside sqaure-brackets (`[` and `]`).

```none
(d)[my content]
```

As you might have noticed, the content of the optional format block is not the same as a normal format block. That's because you can specify anything inside of it, even other regular format blocks (Note: __NOT__ additional optional format blocks!).

```none
(d)[My name is Jeff [mm]]
```

The above content will be rendered when the milliseconds are bigger than zero ... so usually always. Here's a more useful example:

```none
(h)[You have been up for [h] hours! You should go to sleep! ]Hello there.
```

### Escaping

As in most such formats you're also able to escape content as it would maybe interfere with the syntax. Escaping is allowed inside of the regular text and inside an optional format block (Not the definition). The escape character is a backslash (`\`) and is before the character you want to escape. It'll only escape coming up character (Not multiple).

### Syntactic Sugar

Last but not least a little syntactic sugar. Currently there's only the hash (`#`) sign inside of an optional format block. It's a placeholder for the type (and padding!) of the same you specified in the optional format delcaration.

`(h7)[#]` is the same as `(h7)[[h7]]`

## Functions

### constructor(formatString)

The constructor simply takes a string that contains the format. It'll be directly parsed and you get an Aevum-Object back.

### format(content[, performPadding])

The formatting is a method of the Aevum-Object and takes the `content` (`number` or `object`) and an optional `performPadding` (`boolean`, which defaults to `false`).

When `content` is a `number`, it'll be treated as timestamp (in milliseconds). You can pass in any valid number (Not `NaN` or `Infinite`) and it'll get parsed to an Time-Object.

If you pass in an object, it'll try to get the individual parts of a time in the object by the following property-names in order:

- hours: `['hours', 'hour', 'h']`
- minutes: `['minutes', 'minute', 'm']`
- seconds: `['seconds', 'second', 's']`
- milliseconds: `['milliseconds', 'millisecond', 'milli', 'd']`