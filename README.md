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
let format = aevum('My own format: (hh)[#:][mm]:[ss].[ddd]')
format.format(3600123) // Time in milliseconds
// >> "My own format: 1:00:00.123"
format.format({
    hours: 0,
    minutes: 14,
    seconds: 53,
    milliseconds: 436
}) // Using a time-object
// >> "My own format: 14:53.436"
```