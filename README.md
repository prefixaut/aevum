# Aevum

[![Travis](https://img.shields.io/travis/prefixaut/aevum.svg?style=flat-square)](https://travis-ci.org/prefixaut/aevum)
[![npm Version](https://img.shields.io/npm/v/aevum.svg?style=flat-square)](https://www.npmjs.com/package/aevum)
[![Bower](https://img.shields.io/bower/v/aevum.svg?style=flat-square)](https://github.com/prefixaut/aevum/releases)
[![Test Coverage](https://api.codeclimate.com/v1/badges/32437a5db5abfc7b21e8/test_coverage)](https://codeclimate.com/github/prefixaut/aevum/test_coverage)
[![npm License](https://img.shields.io/npm/l/aevum.svg?style=flat-square)](https://spdx.org/licenses/MIT.html)

is a highly customizable time (not date!) formatter. It's syntax is simple and allows you to do format times in a huge fashion!

## Installation

### npm/yarn

The best way to install aevum is via npm/yarn:

```bash
npm install aevum #NPM
yarn add aevum # Yarn
```

### bower

Installing aevum via bower:

```bash
bower install aevum
```

### git

Cloning this repository:

```bash
git clone git@github.com:prefixaut/aevum.git
```

## Usage

```javascript
// ES6 import
import { Aevum } from 'aevum';
new Aevum('...');

// CommonJS Module
const aevum = require('aevum');
new aevum.Aevum('...');

// AMD Module
define(['aevum'], function(aevum) {
    new aevum.Aevum('...');
});
```

Here some basic examples on how it can be used

```javascript
const first = new Aevum('[hh]:[mm]:[ss].[ddd]');
first.format(1); // -> "00:00:00.001"
first.format({
    hours: 1,
    minutes: 23,
    seconds: 45,
    milliseconds: 999
}); // -> "1:23:45.999"

const second = new Aevum('(h)[[hh]:](m)[[mm]:](s)[[ss].](d)[[ddd]]');
second.format(1); // -> "001"
second.format({
    seconds: 45,
    milliseconds: 999
}); // -> "45.999"
second.format({
    minutes: 23,
    seconds: 45,
    milliseconds: 999
}); // -> "23:45.999"
second.format({
    hours: 1,
    minutes: 23,
    seconds: 45,
    milliseconds: 999
}); // -> "1:23:45.999"
```

The system is thought to make a format once and then apply some data to it. This prevents overhead of re-compiling the format every time when a new value is being passed in. You can think of it like a [`RegExp`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).

```javascript
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

These are special Types and can not be used everywhere. The `+` and `-` Types can __only__ be used in [optional format blocks](#optional-format-block) and may __not__ use the `#` as [Syntactic Sugar](#syntactic-sugar). The `?` Type on the other hand, can __only be used as [normal format block](#format-block)__.

### Format Block

An format block is simply put a placeholder. It will be replaced with the content of the type (hours, minutes, seconds or milliseconds) and allows you to specify padding. The format block is specified by surrounding the type with square-brackets (`[` and `]`) like this: `[d]`

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

### format(content[, performPadding[, safe]])

**_Params_**:

- `content` (`number`/`time`): A timestamp (`number`) in __milliseconds__ or a [time-object](#time-object).
- `performPadding` (`boolean`): Flag to perform-padding on smaller time-types.
- `safe` (`boolean`): Flag to accept the time-object without transformation.

**_Description_**:

When the padding is turned on (`performPadding`), smaller time-types are getting converted to the biggest possible padding (See [the Padding](#padding) for more info). Complicated words, so here's an example:

```javascript
const instance = new Aevum('[h]:[m]:[s].[d]');
instance.format({ milliseconds: 1 }, true); // "0:0:0.1"
instance.format({ seconds: 1 }, true); // "0:0:1.000";
instance.format({ minutes: 1 }, true); // "0:1:00.000";
instance.format({ hours: 1 }, true); // "1:00:00.000";
```

The `safe` flag disables the lookup for [aliases](#time-object) and therefore requires you to put in the proper object and parameters. All type-checks are removed as well. This feature is for users which require a high efficency, for example when used in a timer.

## Objects

### Time-Object

The time-object is an object-representation of a time _(duh)_.

**_Fields_**:

- `positive` (`boolean`): If the time is positive
- `hours` (`number`): Amount of hours. Minimal value: `0`
- `minutes` (`number`): Amount of minutes. Minimal value: `0`, Maximal value: `59`
- `seconds` (`number`): Amount of seconds.  Minimal value: `0`, Maximal value: `59`
- `milliseconds` (`number`): Amount of milliseconds.  Minimal value: `0`, Maximal value: `999`

When passed in the [`format`-function](##formatcontent-performpadding-safe), following aliases can be used:

- hours: `hour`, `h`
- minutes: `minute`, `m`
- seconds: `second`, `s`
- milliseconds: `millisecond`, `milli`, `d`