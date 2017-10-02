# Aevum

is a highly customizable time (not date!) formatter. It's syntax is simple and allows you to do whatever you need to do.

## Installation

The best way to install `aevum` is via npm like so
```bash
npm install --save aevum
```

## Usage

Load `aevum`:
- `require('aevum')` via node
- More intregrations soon

Since the parsing of the format-string takes some time that doesn't have to be repeated every time. Therefore you create a format with aevum once and use it's instance to format the time:

```javascript
let format = aevum('My own format: (hh)[#:\\[[mm]\\]][ss].[ddd]')
format.format(3600123) // Time in milliseconds
// >> "My own format: [1:00]00.123"
format.format({
    hours: 0,
    minutes: 14,
    seconds: 53,
    milliseconds: 436
}) // Using a time-object
// >> "My own format: 53.436"
```

## Syntax

Aevum is using a rather simple Syntax and only uses five special characters: `[`, `]`, `(` , `)` and `#`

- `[` and `]` mark a format or a placeholder for a format. The format-delcaration has to come right after the __optional defintion__. Inside a format, you can insert a nested block. But it may not contain another optional defintion.
- `(` and `)` mark an optional defition. The followed format will only be assigned when the value for the format is bigger than zero.
- `#` is syntactic suggar and can be used inside a optional definition and is a placeholder for a format-block with the optional-type.

These formats represent the
- `h`/`hh`: Hours
- `m`/`mm`: Minutes
- `s`/`ss`: Seconds
- `d`/`dd`/`ddd`: Milliseconds

of the time. The single characters will output the value without additional formatting. Double/Tripple/... will append `0`-Characters in front of the value (if needed) for padding the amount of characters you used (Currently only supported for a single padding).

Since text mostly doesn't help out a lot, here're some examples:

```javascript
const aevum = require('aevum');

// This will print the hours no matter what
aevum('Cool format [h]').format({hours: 0}) // >> "Cool format 0"

// This will print the hour only when it's bigger than 0
aevum('Cool format (h)[[h]]').format({hours: 0}) // >> "Cool format "

// So, when the hours are enough
aevum('Cool format (h)[[h]]').format({hours: 1}) // >> "Cool format 1"

// This is the exact same as above with syntactic suggar
aevum('Cool format (h)[#]').format({hours: 1})

// This will apply padding to the value when it's smaller than 10
aevum('Cool format [hh]').format({hours: 15}) // >> "Cool format 15"
aevum('Cool format [hh]').format({hours: 2}) // >> "Cool format 02"

// When a format requires an lower format (m/s/d), they will be displayed when an higher format does exist.
aevum('Format: (ss)[#]').format({minutes: 1}) // >> "Format: 00"
aevum('Format: (ss)[#]').format({milliseconds: 1}) // >> "Format: "
```